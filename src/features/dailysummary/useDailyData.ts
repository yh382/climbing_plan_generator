// src/features/dailysummary/useDailyData.ts
// Aggregates a single day's climb data: active session, completed session
// groups, orphan quick logs, KPIs, and ring percentages.
//
// V2.1.1 — session items sourced from SESSION_LIST_KEY (reliable, populated
// by both endSession and syncFromBackend). Quick logs are the set difference
// between DAY_LIST_KEY and session items by id. Falls back to the legacy
// createdAt time-window match when a session has no SESSION_LIST_KEY entries
// (older data that hasn't been re-synced).
//
// Window AY — adds optional `userId` parameter for "viewing other users'
// public daily summary" via `/users/{userId}/daily/{date}`. When `userId`
// matches the current user (or is omitted), behavior is unchanged.

import { useEffect, useMemo, useState } from "react";
import useLogsStore, { type SessionEntry } from "../../store/useLogsStore";
import { useUserStore } from "../../store/useUserStore";
import { readDayList, readSessionList } from "../journal/loglist/storage";
import type {
  AggregatedClimbItem,
  LocalDayLogItem,
} from "../journal/loglist/types";
import type { SendStyle, Feel } from "../journal/loglist/types";
import type { components } from "../../types/api";

// Window BA — wire-format types come from openapi-typescript codegen.
// FE camelCase domain types (e.g. `AggregatedClimbItem`) stay
// hand-written; mapping happens in the `mapLog` / `mapAggregated`
// helpers below.
type PublicLogItem = components["schemas"]["PublicLogItem"];
type PublicAggregatedItem = components["schemas"]["AggregatedClimbItem"];
type PublicSessionItem = components["schemas"]["PublicSessionItem"];
type PublicDailyResponse = components["schemas"]["PublicDailyOut"];
import { computeDailyIntensity } from "../../services/stats/intensityCalculator";
import { aggregateByRoute } from "../../lib/aggregateClimbItems";
import { api } from "../../lib/apiClient";
import { localDateString } from "../../lib/localDate";
import { foldActiveSessionMinutes } from "./foldActiveSession";

export type SessionGroup = {
  session: SessionEntry;
  items: LocalDayLogItem[];
  /** Window DAILY_GROUP — per-route aggregation of `items`. UI prefers this
   *  to avoid duplicate "Redpoint · 1x" cards from multi-attempt logs. */
  aggregatedItems: AggregatedClimbItem[];
  durationMin: number;
};

export type ActiveSessionInfo = {
  startTime: number;
  gymName: string;
  discipline: SessionEntry["discipline"];
  /** ms-epoch when the session entered status=paused (B2 60-min inactivity
   *  auto-pause or explicit user pause). null while active. Surfaced so the
   *  daily-summary ActiveSessionCard can render Resume controls + a frozen
   *  timer instead of a running clock. */
  pausedAt: number | null;
};

export type DailyKpis = {
  sends: number;
  attempts: number;
  bestGrade: string;
  timeOnWallMin: number;
  quickLogCount: number;
};

export type DailyMeta = {
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export type DailyData = {
  activeSession: ActiveSessionInfo | null;
  sessions: SessionGroup[];
  quickLogs: LocalDayLogItem[];
  /** Window DAILY_GROUP — per-route aggregation of `quickLogs`. */
  aggregatedQuickLogs: AggregatedClimbItem[];
  kpis: DailyKpis;
  /** Per-grade aggregation for current day; fed directly to GradePyramid */
  gradePyramid: Array<{ grade: string; sends: number; attempts: number }>;
  /** 0-100+, sends/attempts capped at 100 */
  topsRatePct: number;
  /** 0-100+, today's session minutes vs 2h goal (overshoot allowed) */
  timeOnWallPct: number;
  /** 0-100, from intensityCalculator */
  intensityPct: number;
  /** Owner identity for the day. Present in remote (other-user) mode; null
   *  when viewing the current user's own data. */
  meta: DailyMeta | null;
};

// Exported so other surfaces (e.g. ExpandableCalendar's day-cell ring) can
// align their fill goal with daily-summary's big ring — see B2-FU.
export const TIME_ON_WALL_GOAL_MIN = 120; // 2h
// User's perception of "today" is local. UTC ISO slicing breaks for users
// west of UTC (afternoon = next UTC day) → see B2 follow-up bug.
const ISO_DATE_TODAY = () => localDateString();

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

/** Pure aggregator — used by both local and remote branches so KPI / pyramid /
 *  percentage logic stays single-source-of-truth. */
function aggregate(input: {
  date: string;
  daySessions: SessionEntry[];
  sessionItemsByKey: Record<string, LocalDayLogItem[]>;
  dayItems: LocalDayLogItem[];
  activeSession: ActiveSessionInfo | null;
  meta: DailyMeta | null;
}): DailyData {
  const { date, daySessions, sessionItemsByKey, dayItems, activeSession, meta } = input;

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
      aggregatedItems: aggregateByRoute(group),
      durationMin: parseDurationToMin(s.duration),
    });
  }

  // Quick logs = day-list items that aren't claimed by any session group.
  const quickLogs = dayItems.filter((it) => !usedItemIds.has(it.id));
  const aggregatedQuickLogs = aggregateByRoute(quickLogs);

  // All items (for KPIs / grade pyramid): union of session groups + quick logs,
  // de-duplicated by id so a single log can't be double-counted.
  const allItemsMap = new Map<string, LocalDayLogItem>();
  for (const g of sessionGroups) {
    for (const it of g.items) allItemsMap.set(it.id, it);
  }
  for (const it of quickLogs) allItemsMap.set(it.id, it);
  const allItems = Array.from(allItemsMap.values());

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

  const topsRatePct =
    totalAttempts > 0
      ? Math.min(100, Math.round((totalSends / totalAttempts) * 100))
      : 0;
  const timeOnWallPct = Math.round(
    (timeOnWallMin / TIME_ON_WALL_GOAL_MIN) * 100,
  );
  const intensity = computeDailyIntensity(allItems);
  const intensityPct = intensity ? Math.round(intensity.value * 100) : 0;

  return {
    activeSession,
    sessions: sessionGroups,
    quickLogs,
    aggregatedQuickLogs,
    kpis,
    gradePyramid,
    topsRatePct,
    timeOnWallPct,
    intensityPct,
    meta,
  };
}

function emptyDailyData(meta: DailyMeta | null = null): DailyData {
  return {
    activeSession: null,
    sessions: [],
    quickLogs: [],
    aggregatedQuickLogs: [],
    kpis: { sends: 0, attempts: 0, bestGrade: "—", timeOnWallMin: 0, quickLogCount: 0 },
    gradePyramid: [],
    topsRatePct: 0,
    timeOnWallPct: 0,
    intensityPct: 0,
    meta,
  };
}

function useLocalDailyData(date: string, enabled: boolean): DailyData {
  const sessions = useLogsStore((s) => (enabled ? s.sessions : null));
  const activeSession = useLogsStore((s) => (enabled ? s.activeSession : null));
  const [dayItems, setDayItems] = useState<LocalDayLogItem[]>([]);
  const [sessionItemsByKey, setSessionItemsByKey] = useState<Record<string, LocalDayLogItem[]>>({});

  // B2 #5+#3: tick every second while an active+unpaused session exists so
  // the time-on-wall ring updates live. Skipped when paused (frozen value)
  // or when no active session (no work to do — no re-render storm).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    if (!activeSession || activeSession.pausedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [enabled, activeSession]);

  // B2 #3: when an active session exists for `date`, build a virtual
  // SessionEntry so it appears as a Session group (in progress) instead of
  // its items leaking into "quick logs". Same shape as completed sessions.
  const today = enabled ? ISO_DATE_TODAY() : "";
  const showActiveAsGroup = enabled && date === today && !!activeSession;
  const activeSessionEntry = useMemo<SessionEntry | null>(() => {
    if (!showActiveAsGroup || !activeSession) return null;
    const startMs = activeSession.startTime;
    const startIso = new Date(startMs).toISOString();
    return {
      id: `active_${startMs}`,
      date,
      startTime: startIso,
      // endTime/duration are placeholders — SessionGroupHeader switches to
      // "in progress" rendering when inProgress=true.
      endTime: startIso,
      duration: "",
      gymName: activeSession.gymName,
      discipline: activeSession.discipline,
      sessionKey: String(startMs),
      sends: 0,
      best: "",
      attempts: 0,
      serverId: activeSession.serverId,
      isPublic: false,
      synced: !!activeSession.serverId,
    };
  }, [showActiveAsGroup, activeSession, date]);

  const daySessions = useMemo(() => {
    if (!enabled) return [];
    const completed = (sessions || [])
      .filter((s) => s.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return activeSessionEntry ? [...completed, activeSessionEntry] : completed;
  }, [enabled, sessions, date, activeSessionEntry]);

  useEffect(() => {
    if (!enabled) return;
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
    // tick is included so the active session's items refetch every second
    // (catches catalog Send writes between ticks). Cheap — readSessionList
    // is just an AsyncStorage key fetch per type.
  }, [enabled, date, daySessions, tick]);

  // Heavy aggregate: only re-runs when the underlying data set changes,
  // NOT every tick. Tick re-renders only adjust the live overlay below.
  const base = useMemo(() => {
    if (!enabled) return emptyDailyData();
    const today = ISO_DATE_TODAY();
    const active =
      date === today && activeSession
        ? {
            startTime: activeSession.startTime,
            gymName: activeSession.gymName,
            discipline: activeSession.discipline,
            pausedAt: activeSession.pausedAt ?? null,
          }
        : null;
    return aggregate({
      date,
      daySessions,
      sessionItemsByKey,
      dayItems,
      activeSession: active,
      meta: null,
    });
  }, [enabled, date, daySessions, sessionItemsByKey, dayItems, activeSession]);

  // B2 #5+#3: fold in the active session's elapsed minutes so the time
  // ring ticks live + reflects end-session immediately (no stale view
  // until syncFromBackend pulls the new SessionEntry). Helper now shared
  // with ExpandableCalendar (B2-FU) — see features/dailysummary/foldActiveSession.
  return useMemo(() => {
    if (!enabled) return base;
    const { liveMin, isToday } = foldActiveSessionMinutes(activeSession, date, ISO_DATE_TODAY());
    if (!isToday || !activeSession) return base;
    const newTimeOnWallMin = base.kpis.timeOnWallMin + liveMin;
    return {
      ...base,
      kpis: { ...base.kpis, timeOnWallMin: newTimeOnWallMin },
      timeOnWallPct: Math.round((newTimeOnWallMin / TIME_ON_WALL_GOAL_MIN) * 100),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, date, base, activeSession, tick]);
}

// ─── Remote (other-user) branch ────────────────────────────────────

const SEND_RESULTS = new Set(["send", "flash", "onsight"]);

function resultToSendStyle(result: string): SendStyle {
  if (result === "flash") return "flash";
  if (result === "onsight") return "onsight";
  // 'send' and (fallback) 'attempt' map to redpoint — for attempts the
  // sendCount is 0 so style is irrelevant in aggregations.
  return "redpoint";
}

function mapLog(remote: PublicLogItem): LocalDayLogItem {
  const isSend = SEND_RESULTS.has(remote.result);
  return {
    id: remote.id,
    date: remote.date,
    type: (remote.wall_type === "toprope" || remote.wall_type === "lead"
      ? remote.wall_type
      : "boulder") as LocalDayLogItem["type"],
    grade: remote.grade_text,
    name: remote.route_name ?? remote.grade_text,
    style: resultToSendStyle(remote.result),
    feel: (remote.feel ?? "solid") as Feel,
    sendCount: isSend ? 1 : 0,
    attemptsTotal: remote.attempts,
    attempts: remote.attempts,
    note: remote.note ?? undefined,
    media: undefined,
    outdoor_route_id: remote.outdoor_route_id ?? null,
    gym_route_id: remote.gym_route_id ?? null,
    createdAt: new Date(remote.created_at).getTime(),
  };
}

function mapAggregated(remote: PublicAggregatedItem): AggregatedClimbItem {
  const wallType = remote.wall_type;
  return {
    routeKey: remote.route_key,
    name: remote.name,
    grade: remote.grade,
    type: (wallType === "toprope" || wallType === "lead"
      ? wallType
      : "boulder") as LocalDayLogItem["type"],
    attemptsTotal: remote.attempts_total,
    sendCount: remote.send_count,
    style: remote.style,
    feel: (remote.feel ?? "solid") as Feel,
    note: remote.note ?? undefined,
    media: undefined,
    outdoor_route_id: remote.outdoor_route_id,
    gym_route_id: remote.gym_route_id,
    latestId: remote.latest_id,
    rawIds: remote.raw_ids,
    createdAt: new Date(remote.created_at).getTime(),
  };
}

function formatDuration(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(minutes ?? 0));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

function dominantDiscipline(logs: PublicLogItem[]): SessionEntry["discipline"] {
  if (logs.length === 0) return "boulder";
  const counts: Record<string, number> = {};
  for (const l of logs) counts[l.wall_type] = (counts[l.wall_type] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0] ?? "boulder";
  if (top === "toprope" || top === "lead") return top;
  return "boulder";
}

function mapSession(remote: PublicSessionItem, date: string): SessionEntry {
  const sends = remote.logs.filter((l) => SEND_RESULTS.has(l.result));
  const best = bestGradeFor(remote.logs.map(mapLog));
  return {
    id: remote.id,
    date,
    startTime: remote.start_time,
    endTime: remote.end_time ?? remote.start_time,
    duration: formatDuration(remote.duration_minutes),
    gymName: remote.gym_name ?? "",
    discipline: dominantDiscipline(remote.logs),
    sessionKey: remote.id,
    sends: sends.length,
    best: best === "—" ? "" : best,
    attempts: remote.logs.length,
    serverId: remote.id,
    isPublic: remote.visibility === "public",
    synced: true,
  };
}

function transformResponse(res: PublicDailyResponse): {
  daySessions: SessionEntry[];
  sessionItemsByKey: Record<string, LocalDayLogItem[]>;
  dayItems: LocalDayLogItem[];
  /** Backend-aggregated per-session arrays. Empty record when the backend
   *  doesn't return the field — caller falls back to FE recomputation. */
  aggregatedBySessionId: Record<string, AggregatedClimbItem[]>;
  aggregatedQuickLogs: AggregatedClimbItem[] | null;
  meta: DailyMeta;
} {
  const daySessions = res.sessions.map((s) => mapSession(s, res.date));
  const sessionItemsByKey: Record<string, LocalDayLogItem[]> = {};
  const aggregatedBySessionId: Record<string, AggregatedClimbItem[]> = {};
  for (const s of res.sessions) {
    sessionItemsByKey[s.id] = s.logs.map(mapLog);
    if (s.aggregated) {
      aggregatedBySessionId[s.id] = s.aggregated.map(mapAggregated);
    }
  }
  // dayItems = all logs (session + quick) for the day. Aggregator will
  // partition into sessions vs quick by usedItemIds; passing the full bag
  // keeps quick_logs visible.
  const allLogs = [...res.sessions.flatMap((s) => s.logs), ...res.quick_logs];
  const dayItems = allLogs.map(mapLog);
  return {
    daySessions,
    sessionItemsByKey,
    dayItems,
    aggregatedBySessionId,
    aggregatedQuickLogs: res.aggregated_quick_logs
      ? res.aggregated_quick_logs.map(mapAggregated)
      : null,
    meta: { userId: res.user_id, username: res.username, avatarUrl: res.avatar_url },
  };
}

function useRemoteDailyData(
  date: string,
  userId: string | undefined,
  enabled: boolean,
): DailyData {
  const [data, setData] = useState<DailyData | null>(null);

  useEffect(() => {
    if (!enabled || !userId) {
      setData(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<PublicDailyResponse>(
          `/users/${userId}/daily/${date}`,
        );
        if (cancelled) return;
        const {
          daySessions,
          sessionItemsByKey,
          dayItems,
          aggregatedBySessionId,
          aggregatedQuickLogs,
          meta,
        } = transformResponse(res);
        const base = aggregate({
          date,
          daySessions,
          sessionItemsByKey,
          dayItems,
          activeSession: null,
          meta,
        });
        // Prefer backend-aggregated arrays when present; otherwise the FE
        // computed equivalents from `aggregate()` above are kept as-is.
        const sessions = base.sessions.map((g) => {
          const fromBackend = aggregatedBySessionId[g.session.id];
          return fromBackend ? { ...g, aggregatedItems: fromBackend } : g;
        });
        setData({
          ...base,
          sessions,
          aggregatedQuickLogs:
            aggregatedQuickLogs ?? base.aggregatedQuickLogs,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[useRemoteDailyData]", err);
        setData(emptyDailyData(null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, date, userId]);

  return data ?? emptyDailyData(null);
}

export function useDailyData(date: string, userId?: string): DailyData {
  const currentUserId = useUserStore((s) => s.user?.id);
  const isSelf = !userId || userId === currentUserId;

  const local = useLocalDailyData(date, isSelf);
  const remote = useRemoteDailyData(date, userId, !isSelf);

  return isSelf ? local : remote;
}
