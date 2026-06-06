// src/services/stats/monthRingComputer.ts
//
// TR6 Phase 1 — single source of truth for the calendar day-cell ring
// data. Replaces the inline aggregation that used to live in
// ExpandableCalendar so all three callers (Journal / SessionsSegment /
// TrainingSegment) get the same numbers without copy-paste drift.
//
// ROADMAP §3 decision Calendar 双环新语义 (方案 F):
//   - 外环 = `(climb_min + train_min) / 60` "攀岩及训练时长" (单色)
//   - 内环 = climb_sends / 10 (单色)
//   - 底部 dot 4 state: planned-pending / in-progress / complete / missed
//
// `plan_status` here is the FE-friendly derivation that the day-ring's
// dot consumes (TR6 Phase 2 swift wiring). We keep climb_min + train_min
// split (P2-15 nudge) so future UI can break them out without resetting
// the shape.

import { foldActiveSessionMinutes } from "@/features/dailysummary/foldActiveSession";
import type { SessionEntry } from "@/store/useLogsStore";

/** Parse "2h 30m" / "45m" duration strings. Inlined to avoid a wider
 *  refactor of the 3+ copies sprinkled across the codebase. */
function parseDurationToMin(dur: string): number {
  if (!dur) return 0;
  let total = 0;
  const hMatch = dur.match(/(\d+)\s*h/i);
  const mMatch = dur.match(/(\d+)\s*m/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total;
}

/** Day-cell ring payload exposed to the calendar widget. */
export interface MonthRingData {
  /** Climb session minutes only — outer ring contribution from climb side. */
  climb_min: number;
  /** Train session minutes (template-driven) — second outer-ring contribution. */
  train_min: number;
  /** Convenience: climb_min + train_min. Outer ring divides by 60. */
  total_min: number;
  /** Number of successful climb sends — inner ring divides by 10. */
  climb_sends: number;
  /** Bottom dot. Drives the 4-state branch in CalendarDayRingView (TR6 Ph2). */
  plan_status: "none" | "pending" | "in_progress" | "complete" | "missed";
}

export type MonthRingMap = Record<string, MonthRingData>;

const EMPTY: MonthRingData = {
  climb_min: 0,
  train_min: 0,
  total_min: 0,
  climb_sends: 0,
  plan_status: "none",
};

/** Build the per-date ring map from the same data sources Activity tab
 *  already pulls. Pure function — caller decides re-render cadence. */
export function buildMonthRingMap(args: {
  sessions: SessionEntry[];
  /** Live-firing active session (drives today's bucket on tick). */
  activeSession: {
    startTime: string;
    date: string;
    discipline?: string;
    sessionType?: "climb" | "train" | "mixed";
  } | null;
  /** Sends recorded against the active session since it started. */
  activeSends: number;
  /** Today's local date string ("YYYY-MM-DD") for the active-fold target. */
  todayLocalDate: string;
  /** Legacy plan-progress percentage map from usePlanStore. We translate
   *  it into `plan_status`. Pass `{}` when not consuming plan data. */
  planProgressPctMap: Record<string, number>;
  /** Server-provided per-date list of planned template_ids. Empty / absent
   *  date = no plan for that day. */
  plannedMap?: Record<string, string[]>;
  /** Compare-against-today helper. Defaults to ISO of `now`. */
  now?: Date;
}): MonthRingMap {
  const {
    sessions,
    activeSession,
    activeSends,
    todayLocalDate,
    planProgressPctMap,
    plannedMap = {},
    now = new Date(),
  } = args;

  const map: MonthRingMap = {};
  const upsert = (date: string): MonthRingData => {
    if (!map[date]) map[date] = { ...EMPTY };
    return map[date];
  };

  for (const s of sessions) {
    const cell = upsert(s.date);
    const mins = parseDurationToMin(s.duration);
    // TR0 session_type — defaults to "climb" when missing (older sessions
    // synced before the BE migration).
    const stype = s.sessionType ?? "climb";
    if (stype === "train") {
      cell.train_min += mins;
    } else if (stype === "mixed") {
      // Split heuristic: count toward both buckets but don't double-count
      // total_min. Half-and-half keeps the outer ring honest while
      // letting future analytics treat mixed days separately.
      cell.climb_min += mins / 2;
      cell.train_min += mins / 2;
    } else {
      cell.climb_min += mins;
    }
    cell.climb_sends += s.sends ?? 0;
  }

  // Fold the live active session into today's bucket so the rings advance
  // by the second instead of jumping at session-end.
  if (activeSession) {
    const { liveMin, isToday } = foldActiveSessionMinutes(
      activeSession,
      todayLocalDate,
      todayLocalDate,
    );
    if (isToday && liveMin > 0) {
      const cell = upsert(todayLocalDate);
      const stype = activeSession.sessionType ?? "climb";
      if (stype === "train") cell.train_min += liveMin;
      else if (stype === "mixed") {
        cell.climb_min += liveMin / 2;
        cell.train_min += liveMin / 2;
      } else cell.climb_min += liveMin;
      cell.climb_sends += activeSends;
    }
  }

  // Plan-status derivation. The legacy single-percentage map only
  // covered "in_progress" vs "complete" — TR6 widens that to pending /
  // missed via the schedule:
  //   - planned for that day AND date <= today AND pct == 0 → pending
  //     (today) or missed (past)
  //   - planned AND pct > 0 → in_progress
  //   - pct >= 100 → complete
  //   - no plan, no progress → none
  const todayISO = todayLocalDate;
  for (const date of new Set([
    ...Object.keys(planProgressPctMap),
    ...Object.keys(plannedMap),
  ])) {
    const cell = upsert(date);
    const pct = planProgressPctMap[date] ?? 0;
    const planned = (plannedMap[date]?.length ?? 0) > 0;
    if (pct >= 100) {
      cell.plan_status = "complete";
    } else if (pct > 0) {
      cell.plan_status = "in_progress";
    } else if (planned) {
      // Missed only when the date has fully passed (calendar day before
      // today). Today still counts as "pending" until end-of-day.
      cell.plan_status = date < todayISO ? "missed" : "pending";
    } else {
      cell.plan_status = "none";
    }
  }

  // Finalize total_min after both passes (climb + train + live fold).
  for (const date of Object.keys(map)) {
    const cell = map[date];
    cell.total_min = Math.round(cell.climb_min + cell.train_min);
    // Keep float-driven splits clean for downstream display.
    cell.climb_min = Math.round(cell.climb_min);
    cell.train_min = Math.round(cell.train_min);
  }

  // Today should be marked even on a fresh day with no activity so the
  // calendar can render a base ring + today-dot.
  if (!map[todayISO]) {
    map[todayISO] = { ...EMPTY };
  }

  return map;
}
