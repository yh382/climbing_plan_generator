// src/features/dailysummary/useDailyData.ts
// Aggregates a single day's climb data: active session, completed session
// groups, orphan quick logs, KPIs, and ring percentages.
//
// V2.1.1 — session items sourced from SESSION_LIST_KEY (reliable, populated
// by both endSession and syncFromBackend). Quick logs are the set difference
// between DAY_LIST_KEY and session items by id. Falls back to the legacy
// createdAt time-window match when a session has no SESSION_LIST_KEY entries
// (older data that hasn't been re-synced).

import { useEffect, useMemo, useState } from "react";
import useLogsStore, { type SessionEntry } from "../../store/useLogsStore";
import { readDayList, readSessionList } from "../journal/loglist/storage";
import type { LocalDayLogItem } from "../journal/loglist/types";
import { computeDailyIntensity } from "../../services/stats/intensityCalculator";

export type SessionGroup = {
  session: SessionEntry;
  items: LocalDayLogItem[];
  durationMin: number;
};

export type ActiveSessionInfo = {
  startTime: number;
  gymName: string;
  discipline: SessionEntry["discipline"];
};

export type DailyKpis = {
  sends: number;
  attempts: number;
  bestGrade: string;
  timeOnWallMin: number;
  quickLogCount: number;
};

export type DailyData = {
  activeSession: ActiveSessionInfo | null;
  sessions: SessionGroup[];
  quickLogs: LocalDayLogItem[];
  kpis: DailyKpis;
  /** Per-grade aggregation for current day; fed directly to GradePyramid */
  gradePyramid: Array<{ grade: string; sends: number; attempts: number }>;
  /** 0-100+, sends/attempts capped at 100 */
  topsRatePct: number;
  /** 0-100+, today's session minutes vs 2h goal (overshoot allowed) */
  timeOnWallPct: number;
  /** 0-100, from intensityCalculator */
  intensityPct: number;
};

const TIME_ON_WALL_GOAL_MIN = 120; // 2h
const ISO_DATE_TODAY = () => new Date().toISOString().slice(0, 10);

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

function bestGradeFor(items: LocalDayLogItem[]): string {
  if (items.length === 0) return "—";
  const hasBoulder = items.some((it) => /^V\d+/i.test(it.grade));
  const hasRope = items.some((it) => /^5\./.test(it.grade));
  if (hasBoulder) {
    return items
      .map((it) => String(it.grade || "").trim())
      .filter((g) => /^V\d+/i.test(g))
      .sort((a, b) => vNumber(b) - vNumber(a))[0] || "—";
  }
  if (hasRope) {
    return items
      .map((it) => String(it.grade || "").trim())
      .filter((g) => /^5\./.test(g))
      .sort((a, b) => ydsRank(b) - ydsRank(a))[0] || "—";
  }
  return "—";
}

/** Read every item for a session by reading all three disciplines' lists. */
async function readAllSessionItems(sessionKey: string): Promise<LocalDayLogItem[]> {
  if (!sessionKey) return [];
  const [b, tr, l] = await Promise.all([
    readSessionList(sessionKey, "boulder"),
    readSessionList(sessionKey, "toprope"),
    readSessionList(sessionKey, "lead"),
  ]);
  return [...(b || []), ...(tr || []), ...(l || [])];
}

/** Read every item for a day from DAY_LIST_KEY (all three disciplines). */
async function readAllDayItems(date: string): Promise<LocalDayLogItem[]> {
  const [b, tr, l] = await Promise.all([
    readDayList(date, "boulder"),
    readDayList(date, "toprope"),
    readDayList(date, "lead"),
  ]);
  return [...(b || []), ...(tr || []), ...(l || [])];
}

export function useDailyData(date: string): DailyData {
  const { sessions, activeSession } = useLogsStore();
  const [dayItems, setDayItems] = useState<LocalDayLogItem[]>([]);
  const [sessionItemsByKey, setSessionItemsByKey] = useState<Record<string, LocalDayLogItem[]>>({});

  // Day sessions needed as the dependency for sessionItemsByKey loader.
  const daySessions = useMemo(
    () =>
      (sessions || [])
        .filter((s) => s.date === date)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [sessions, date],
  );

  // Load DAY_LIST_KEY items (full-day bag) and SESSION_LIST_KEY items per session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [dayBag, sessionBags] = await Promise.all([
        readAllDayItems(date),
        Promise.all(
          daySessions.map(async (s) => {
            const items = await readAllSessionItems(s.sessionKey);
            return [s.sessionKey, items] as const;
          }),
        ),
      ]);
      if (cancelled) return;
      setDayItems(dayBag);
      setSessionItemsByKey(Object.fromEntries(sessionBags));
    })();
    return () => {
      cancelled = true;
    };
    // daySessions identity changes whenever sessions / date do, covering
    // endSession writes + new session creation + sync refreshes.
  }, [date, daySessions]);

  return useMemo(() => {
    const today = ISO_DATE_TODAY();

    const sessionGroups: SessionGroup[] = [];
    const usedItemIds = new Set<string>();

    for (const s of daySessions) {
      let group = sessionItemsByKey[s.sessionKey] ?? [];

      // Legacy fallback: if the session has no SESSION_LIST_KEY entries
      // (e.g. pre-sync historical data), fall back to the old time-window
      // match against the day bag. Fresh data never hits this branch.
      if (group.length === 0 && s.sessionKey) {
        const startMs = new Date(s.startTime).getTime();
        const endMs = new Date(s.endTime).getTime();
        group = dayItems.filter(
          (it) => it.createdAt >= startMs && it.createdAt <= endMs,
        );
      }

      group.forEach((it) => usedItemIds.add(it.id));
      sessionGroups.push({
        session: s,
        items: group,
        durationMin: parseDurationToMin(s.duration),
      });
    }

    // Quick logs = day-list items that aren't claimed by any session group.
    const quickLogs = dayItems.filter((it) => !usedItemIds.has(it.id));

    // All items (for KPIs / grade pyramid): union of session groups + quick logs,
    // de-duplicated by id so a single log can't be double-counted even if the
    // same id somehow appears in both SESSION_LIST_KEY and DAY_LIST_KEY.
    const allItemsMap = new Map<string, LocalDayLogItem>();
    for (const g of sessionGroups) {
      for (const it of g.items) allItemsMap.set(it.id, it);
    }
    for (const it of quickLogs) allItemsMap.set(it.id, it);
    const allItems = Array.from(allItemsMap.values());

    // KPIs
    const totalSends = allItems.reduce(
      (sum, it) => sum + (it.sendCount ?? 0),
      0,
    );
    const totalAttempts = allItems.reduce(
      (sum, it) => sum + (it.attemptsTotal ?? it.attempts ?? 1),
      0,
    );
    const timeOnWallMin = sessionGroups.reduce((m, g) => m + g.durationMin, 0);

    const kpis: DailyKpis = {
      sends: totalSends,
      attempts: totalAttempts,
      bestGrade: bestGradeFor(allItems),
      timeOnWallMin,
      quickLogCount: quickLogs.length,
    };

    // Grade pyramid
    const gradeMap = new Map<string, { sends: number; attempts: number }>();
    for (const it of allItems) {
      const g = String(it.grade || "").trim();
      if (!g) continue;
      const prev = gradeMap.get(g) ?? { sends: 0, attempts: 0 };
      prev.sends += it.sendCount ?? 0;
      prev.attempts += it.attemptsTotal ?? it.attempts ?? 1;
      gradeMap.set(g, prev);
    }
    const gradePyramid = Array.from(gradeMap.entries()).map(([grade, v]) => ({
      grade,
      sends: v.sends,
      attempts: v.attempts,
    }));

    // Percentages
    const topsRatePct =
      totalAttempts > 0
        ? Math.min(100, Math.round((totalSends / totalAttempts) * 100))
        : 0;
    const timeOnWallPct = Math.round(
      (timeOnWallMin / TIME_ON_WALL_GOAL_MIN) * 100,
    );
    const intensity = computeDailyIntensity(allItems);
    const intensityPct = intensity ? Math.round(intensity.value * 100) : 0;

    const active =
      date === today && activeSession
        ? {
            startTime: activeSession.startTime,
            gymName: activeSession.gymName,
            discipline: activeSession.discipline,
          }
        : null;

    return {
      activeSession: active,
      sessions: sessionGroups,
      quickLogs,
      kpis,
      gradePyramid,
      topsRatePct,
      timeOnWallPct,
      intensityPct,
    };
  }, [date, daySessions, sessionItemsByKey, dayItems, activeSession]);
}
