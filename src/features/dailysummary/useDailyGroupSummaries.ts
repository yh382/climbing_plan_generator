// src/features/dailysummary/useDailyGroupSummaries.ts
// Per-date aggregation of `useLogsStore.sessions`. Multiple sessions on the
// same day fold into a single DailyGroupSummary so Activity tab + Profile
// list show "one card per day" instead of per-session duplicates.
//
// Window DAILY_GROUP — companion to useDailyData (single date) for the
// list views. Pure derived selector, no store mutation.

import { useMemo } from "react";
import { parseISO } from "date-fns";

import useLogsStore, { type SessionEntry } from "../../store/useLogsStore";

export type DailyGroupSummary = {
  date: string;             // YYYY-MM-DD
  totalDurationMin: number; // sum of session durations
  totalSends: number;       // sum across sessions
  totalAttempts: number;    // sum across sessions
  bestGrade: string;        // best across sessions ("—" when empty)
  sessions: SessionEntry[]; // ordered by startTime asc
};

type Options = {
  /** Lower bound (inclusive) on session date. Sessions with date >= from
   *  are included. Compared as `parseISO(date)`. */
  from?: Date;
  /** Cap the result to the N most-recent dates. */
  limit?: number;
  /** TR6 Phase 5 — restrict to sessions matching the given activity type.
   *  - "all" / undefined → no filter
   *  - "climb"           → session_type ∈ {"climb", "mixed"}
   *  - "train"           → session_type ∈ {"train", "mixed"}
   *  "mixed" sessions surface under both filters intentionally (per
   *  ROADMAP §6.1 P2-16). Sessions synced before TR0 have no
   *  session_type field and default to "climb". */
  activityType?: "all" | "climb" | "train";
};

function parseDurationToMin(dur: string): number {
  let total = 0;
  const hMatch = dur.match(/(\d+)\s*h/i);
  const mMatch = dur.match(/(\d+)\s*m/i);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total;
}

function vNumber(grade: string): number {
  const m = String(grade || "").match(/V(\d+)/i);
  return m ? parseInt(m[1], 10) : -1;
}

function ydsRank(grade: string): number {
  const m = String(grade || "").match(/5\.(\d+)([a-d])?/i);
  if (!m) return -1;
  const base = parseInt(m[1], 10) * 10;
  const suffix = m[2]?.toLowerCase();
  const bonus = suffix ? suffix.charCodeAt(0) - "a".charCodeAt(0) + 1 : 0;
  return base + bonus;
}

function bestOf(a: string, b: string): string {
  const aa = (a || "").trim();
  const bb = (b || "").trim();
  if (!aa) return bb;
  if (!bb) return aa;
  // Boulder beats rope when both present is wrong assumption — pick whichever
  // is "higher" within its own family. If they differ in family, prefer the
  // one with the higher relative rank in its own family (boulder by V; rope
  // by yds). Same family: simple max.
  const aIsB = /^V\d+/i.test(aa);
  const bIsB = /^V\d+/i.test(bb);
  const aIsR = /^5\./.test(aa);
  const bIsR = /^5\./.test(bb);
  if (aIsB && bIsB) return vNumber(aa) >= vNumber(bb) ? aa : bb;
  if (aIsR && bIsR) return ydsRank(aa) >= ydsRank(bb) ? aa : bb;
  // Mixed family: keep the existing one.
  return aa;
}

export function useDailyGroupSummaries(opts: Options = {}): DailyGroupSummary[] {
  const sessions = useLogsStore((s) => s.sessions);
  const { from, limit, activityType = "all" } = opts;

  return useMemo(() => {
    if (!sessions || sessions.length === 0) return [];

    // TR6 Phase 5 — activity type filter. "mixed" sessions surface
    // under both "climb" and "train" so they don't disappear from
    // either tab (per ROADMAP §6.1 P2-16).
    const typeFiltered = activityType === "all"
      ? sessions
      : sessions.filter((s) => {
          const t = s.sessionType ?? "climb";
          if (activityType === "climb") return t === "climb" || t === "mixed";
          if (activityType === "train") return t === "train" || t === "mixed";
          return true;
        });

    const filtered = from
      ? typeFiltered.filter((s) => parseISO(s.date) >= from)
      : typeFiltered;

    const byDate = new Map<string, DailyGroupSummary>();
    for (const s of filtered) {
      const existing = byDate.get(s.date);
      if (!existing) {
        byDate.set(s.date, {
          date: s.date,
          totalDurationMin: parseDurationToMin(s.duration),
          totalSends: s.sends ?? 0,
          totalAttempts: s.attempts ?? 0,
          bestGrade: (s.best || "").trim() || "—",
          sessions: [s],
        });
      } else {
        existing.totalDurationMin += parseDurationToMin(s.duration);
        existing.totalSends += s.sends ?? 0;
        existing.totalAttempts += s.attempts ?? 0;
        const next = bestOf(existing.bestGrade === "—" ? "" : existing.bestGrade, s.best || "");
        existing.bestGrade = next || "—";
        existing.sessions.push(s);
      }
    }

    for (const grp of byDate.values()) {
      grp.sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    const out = Array.from(byDate.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    return typeof limit === "number" ? out.slice(0, limit) : out;
  }, [sessions, from, limit, activityType]);
}
