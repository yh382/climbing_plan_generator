// src/store/useLogsStore.ts
import { createWithEqualityFn } from "zustand/traditional";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { shallow } from "zustand/shallow";
import { useCallback } from "react";
import { api, ApiError } from "../lib/apiClient";
import {
  enqueueSessionEvent,
  purgeSessionOutboxByKey,
  flushSessionsOutbox,
} from "../features/journal/sync/sessionsOutbox";
import {
  setSessionServerId,
  getSessionServerId,
  removeSessionServerId,
  readAllSessionServerIds,
} from "../features/journal/sync/sessionServerIdMap";
import {
  markSessionDeleted,
  unmarkSessionDeleted,
  readDeletedSessionKeys,
} from "../features/journal/sync/sessionDeletedKeys";
import {
  purgeLogsOutboxBySessionKey,
  flushLogsOutbox,
} from "../features/journal/sync/logsOutbox";
import {
  readAllServerIds,
  setServerId,
} from "../features/journal/sync/serverIdMap";
import { useAuthStore } from "./useAuthStore";
import {
  writeBackupSnapshot,
  clearBackupSnapshot,
} from "../features/journal/sync/localBackup";
import { syncWidgetFromStore } from "../lib/widgetBridge";
import { startLiveActivity, endLiveActivity } from "../lib/liveActivityBridge";

// In-flight POST /sessions promise — endSession awaits this to avoid race condition
let _sessionCreatePromise: Promise<string | null> | null = null;

// ✅ 关键：结束 session 时，把 sessionList 落到 dayList，并生成 session summary
import {
  readSessionList,
  clearSessionList,
  readDayList,
  writeDayList,
  writeSessionList,
} from "../features/journal/loglist/storage";
import type { LocalDayLogItem } from "../features/journal/loglist/types";

export type LogType = "boulder" | "toprope" | "lead";

export type LogEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: LogType;
  grade: string;
  count: number; // 聚合：sends（不是 items 数）
};

export type SessionEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime: string; // ISO
  duration: string; // "2h 30m"
  gymName: string;
  discipline: LogType;

  // ✅ NEW: 用于 calendar 每张卡 session 维度展示/跳转
  sessionKey: string; // String(activeSession.startTime)
  sends: number;      // 本 session sends
  best: string;       // 本 session best（优先 V，否则 YDS）
  climbs: number;     // 本 session total climb items

  // V7-B: 后端同步
  serverId: string | null;
  isPublic: boolean;
  synced: boolean;
};

export type GradeCount = { grade: string; count: number };

type LogsState = {
  logs: LogEntry[];

  sessions: SessionEntry[];
  activeSession: { startTime: number; gymName: string; discipline: LogType; serverId: string | null } | null;

  upsertCount: (p: { date: string; type: LogType; grade: string; delta: number }) => void;
  remove: (id: string) => void;
  resetDay: (date: string, type?: LogType) => void;

  startSession: (gymName: string, discipline: LogType, gymId?: string | null) => void;
  endSession: () => Promise<SessionEntry | null>;
  discardActiveSession: () => Promise<void>;
  deleteSession: (sessionKey: string) => Promise<string[]>;
  toggleSessionPublic: (sessionKey: string) => Promise<void>;

  awaitSessionServerId: () => Promise<string | null>;

  syncFromBackend: () => Promise<void>;
  isSyncing: boolean;
  hasSyncedOnce: boolean;
  _hydrated: boolean;
  _lastEndSessionTime: number;

  countByDateType: (date: string, type: LogType) => number;
  countsForWeek: (weekStart: string, type: LogType) => Record<string, number>;
  getSegmentsByDate: (date: string, type?: LogType) => GradeCount[];
  getHashByDate: (date: string, type?: LogType) => string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function hashSegments(list: GradeCount[]): string {
  if (!list?.length) return "0";
  return [...list]
    .sort((a, b) => a.grade.localeCompare(b.grade))
    .map(({ grade, count }) => `${grade}:${count}`)
    .join("|");
}

function buildSegments(logs: LogEntry[], date: string, type?: LogType): GradeCount[] {
  const filtered = logs.filter((l) => l.date === date && (!type || l.type === type));
  if (!filtered.length) return [];
  const map = new Map<string, number>();
  for (const l of filtered) {
    const key = l.grade || "unknown";
    map.set(key, (map.get(key) ?? 0) + (l.count ?? 0));
  }
  return Array.from(map.entries()).map(([grade, count]) => ({ grade, count }));
}

// ✅ infer sendCount from an item
function inferSendCount(item: any): number {
  if (typeof item?.sendCount === "number") return item.sendCount;
  const style = item?.style;
  if (style === "redpoint" || style === "flash" || style === "onsight") return 1;
  if (item?.isSent === true) return 1;
  if (item?.status === "sent" || item?.status === "send") return 1;
  return 0;
}

function vNumber(g?: string): number {
  if (!g) return -1;
  const m = String(g).trim().match(/^V(\d+)/i);
  return m ? parseInt(m[1], 10) : -1;
}

function ydsRank(g?: string): number {
  if (!g) return -1;
  const s = String(g).trim();
  const m = s.match(/^5\.(\d+)([abcd+-])?$/i);
  if (!m) return -1;
  const major = parseInt(m[1], 10);
  const suf = (m[2] || "").toLowerCase();
  const sufMap: Record<string, number> = { "": 0, a: 1, b: 2, c: 3, d: 4, "+": 5, "-": -1 };
  return major * 10 + (sufMap[suf] ?? 0);
}

// ✅ merge arrays by id
function mergeById<T extends { id: string }>(base: T[], add: T[]): T[] {
  const seen = new Set((base || []).map((x) => x.id));
  const out = [...(base || [])];
  for (const it of add || []) {
    if (!it?.id) continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

// ✅ rebuild aggregated LogEntry[] (sends per grade) from day items
function aggregateSends(date: string, type: LogType, items: any[]): LogEntry[] {
  const map = new Map<string, number>();
  for (const it of items || []) {
    const grade = String(it?.grade || "—").trim() || "—";
    const delta = inferSendCount(it);
    if (delta <= 0) continue;
    map.set(grade, (map.get(grade) || 0) + delta);
  }
  return Array.from(map.entries()).map(([grade, count]) => ({
    id: `${date}_${type}_${grade}`,
    date,
    type,
    grade,
    count,
  }));
}

// Backend result → frontend style mapping
const RESULT_TO_STYLE: Record<string, string> = {
  send: "redpoint", flash: "flash", onsight: "onsight", attempt: "redpoint",
};

function backendLogToLocal(log: any): LocalDayLogItem {
  return {
    id: String(log.id),
    date: log.date,
    type: log.wall_type as any,
    grade: log.grade_text,
    name: log.route_name || log.grade_text,
    style: (RESULT_TO_STYLE[log.result] || "redpoint") as any,
    feel: (log.feel || "solid") as any,
    sendCount: ["send", "flash", "onsight"].includes(log.result) ? 1 : 0,
    attemptsTotal: log.attempts || 1,
    attempts: log.attempts || 1,
    note: log.note || undefined,
    media: log.media?.map((m: any) => ({
      id: m.id || `m_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: m.type,
      uri: m.url || m.uri,           // backend uses `url`; fallback `uri` for legacy rows
      coverUri: m.thumbUrl || m.coverUri,
    })),
    createdAt: new Date(log.created_at).getTime(),
  };
}

/**
 * Merge backend session list with local session list.
 * - Backend items update local items (newer data from server)
 * - BUT: preserve local `media` if backend item has none (media may not have synced yet)
 * - Local-only items (not on backend) are kept (outbox hasn't flushed yet)
 */
function mergeSessionListPreserveLocal(
  backendItems: LocalDayLogItem[],
  localItems: LocalDayLogItem[],
): LocalDayLogItem[] {
  const localById = new Map(localItems.map((it) => [it.id, it]));
  const mergedIds = new Set<string>();
  const result: LocalDayLogItem[] = [];

  for (const bItem of backendItems) {
    mergedIds.add(bItem.id);
    const local = localById.get(bItem.id);
    if (local) {
      // Backend item exists locally — use backend data but preserve local media if backend has none
      const hasBackendMedia = Array.isArray(bItem.media) && bItem.media.length > 0
        && bItem.media.some((m) => !!m.uri);
      const hasLocalMedia = Array.isArray(local.media) && local.media.length > 0
        && local.media.some((m) => !!m.uri);
      result.push({
        ...bItem,
        media: hasBackendMedia ? bItem.media : (hasLocalMedia ? local.media : bItem.media),
      });
    } else {
      result.push(bItem);
    }
  }

  // Keep local-only items (not yet synced to backend)
  for (const local of localItems) {
    if (!mergedIds.has(local.id)) {
      result.push(local);
    }
  }

  return result;
}

const useLogsStore = createWithEqualityFn<LogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      sessions: [],
      activeSession: null,
      isSyncing: false,
      hasSyncedOnce: false,
      _hydrated: false,
      _lastEndSessionTime: 0,

      awaitSessionServerId: async () => {
        const current = get().activeSession?.serverId;
        if (current) return current;
        if (_sessionCreatePromise) {
          return await _sessionCreatePromise;
        }
        return null;
      },

      syncFromBackend: async () => {
        // Wait for persist hydration — running before hydration loses local-only sessions
        if (!get()._hydrated) return;
        if (get().isSyncing) return;
        // Cooldown: skip sync if endSession just ran (outbox still flushing)
        const msSinceEnd = Date.now() - (get()._lastEndSessionTime || 0);
        if (msSinceEnd < 15_000) return;
        set({ isSyncing: true });
        try {
          // PUSH first: flush local outboxes so any pending creates/ends/
          // deletes reach the backend before we pull. Without this, sync is
          // pull-only — pending logs/sessions sitting in the outbox would
          // never get sent, and the user has to navigate to journal page to
          // trigger flush manually. The journal-page-focus flush still runs
          // (idempotent), this just makes sync self-contained.
          //
          // Order matters: sessions before logs, so that log create events
          // can resolve their session_id from the freshly-populated map.
          const token = useAuthStore.getState().accessToken;
          if (token) {
            try {
              const sMap = await readAllSessionServerIds();
              await flushSessionsOutbox({
                resolveServerId: (k) => sMap[k] ?? null,
                saveServerId: async (k, id) => {
                  await setSessionServerId(k, id);
                  sMap[k] = id;
                },
              });
            } catch (e) {
              if (__DEV__) console.warn("[syncFromBackend] flushSessionsOutbox failed:", e);
            }
            try {
              const idMap = await readAllServerIds();
              await flushLogsOutbox({
                token,
                resolveServerId: (localId) => idMap[localId] ?? null,
                saveServerId: async (localId, serverId) => {
                  await setServerId(localId, serverId);
                },
              });
            } catch (e) {
              if (__DEV__) console.warn("[syncFromBackend] flushLogsOutbox failed:", e);
            }
          }

          const [sessionsData, logsData, deletedKeys] = await Promise.all([
            api.get<any[]>("/sessions/me"),
            api.get<any[]>("/climb-logs/me"),
            readDeletedSessionKeys(),
          ]);

          // Build the set of backend session IDs whose local sessionKey is
          // tombstoned. Any log whose session_id points to one of these must
          // be filtered out before merging into day lists, otherwise the
          // deleted session's logs would resurface in the calendar.
          const tombstonedServerIds = new Set<string>();
          for (const s of sessionsData || []) {
            const startMs = new Date(s.start_time).getTime();
            const k = String(startMs);
            if (deletedKeys.has(k)) {
              tombstonedServerIds.add(String(s.id));
            }
          }
          const visibleLogs = (logsData || []).filter((log: any) => {
            if (log.session_id && tombstonedServerIds.has(String(log.session_id))) {
              return false;
            }
            return true;
          });

          if (__DEV__) {
            console.log("[syncFromBackend] sessions:", sessionsData?.length ?? 0,
              "| completed:", sessionsData?.filter((s: any) => s.status === "completed").length ?? 0,
              "| logs:", logsData?.length ?? 0,
              "| tombstoned:", deletedKeys.size,
              "| filtered logs:", visibleLogs.length);
          }

          // Group logs by session_id
          const logsBySession = new Map<string, any[]>();
          for (const log of visibleLogs) {
            if (log.session_id) {
              const key = String(log.session_id);
              if (!logsBySession.has(key)) logsBySession.set(key, []);
              logsBySession.get(key)!.push(log);
            }
          }

          // Group logs by date|type for day lists
          const logsByDateType = new Map<string, { date: string; type: LogType; logs: any[] }>();
          for (const log of visibleLogs) {
            const key = `${log.date}|${log.wall_type}`;
            if (!logsByDateType.has(key)) {
              logsByDateType.set(key, { date: log.date, type: log.wall_type, logs: [] });
            }
            logsByDateType.get(key)!.logs.push(log);
          }

          // ALWAYS populate the serverId map for every backend session,
          // including "active" ones. Without this, a session left in active
          // state by a mid-session JS bundle reload (or crash) is never
          // associated with a serverId locally — so deleteSession() can't
          // find a backend id to call DELETE on, and the orphan session +
          // its logs stay on the backend forever.
          for (const s of sessionsData || []) {
            const startMs = new Date(s.start_time).getTime();
            const sessionKey = String(startMs);
            await setSessionServerId(sessionKey, String(s.id));
          }

          // Self-healing tombstone retry: any session the user previously
          // tried to delete but whose backend DELETE never landed (offline,
          // racing with reload, etc.) — try to delete it directly now while
          // we have network. On success, clear the tombstone + map entry.
          // This is a no-op when there are no stuck tombstones.
          for (const s of sessionsData || []) {
            const startMs = new Date(s.start_time).getTime();
            const sessionKey = String(startMs);
            if (!deletedKeys.has(sessionKey)) continue;
            try {
              await api.del(`/sessions/${String(s.id)}`);
              await unmarkSessionDeleted(sessionKey);
              await removeSessionServerId(sessionKey);
              if (__DEV__) {
                console.log("[syncFromBackend] auto-cleaned tombstoned backend session", sessionKey);
              }
            } catch (e: any) {
              if (e instanceof ApiError && e.status === 404) {
                // Already gone — clean up local bookkeeping
                await unmarkSessionDeleted(sessionKey);
                await removeSessionServerId(sessionKey);
              } else if (__DEV__) {
                console.warn("[syncFromBackend] auto-clean failed for", sessionKey, e?.message || e);
              }
            }
          }

          // Drop orphaned tombstones — keys in deletedKeys whose backend
          // session is no longer present in sessionsData. The backend has
          // already converged to the desired state (session gone), so the
          // tombstone has nothing left to protect against.
          const backendSessionKeys = new Set<string>();
          for (const s of sessionsData || []) {
            backendSessionKeys.add(String(new Date(s.start_time).getTime()));
          }
          const orphanedTombstones: string[] = [];
          for (const key of deletedKeys) {
            if (!backendSessionKeys.has(key)) {
              orphanedTombstones.push(key);
            }
          }
          for (const key of orphanedTombstones) {
            await unmarkSessionDeleted(key);
            await removeSessionServerId(key);
          }
          if (__DEV__ && orphanedTombstones.length > 0) {
            console.log(
              "[syncFromBackend] dropped",
              orphanedTombstones.length,
              "orphaned tombstone(s) (no matching backend session):",
              orphanedTombstones,
            );
          }

          // Diagnostic: count logs that have no session_id (orphaned logs).
          // These can't be cleaned by the session DELETE cascade.
          if (__DEV__) {
            const sessionLessLogs = (logsData || []).filter((l: any) => !l.session_id).length;
            if (sessionLessLogs > 0) {
              console.log(
                "[syncFromBackend] WARNING:",
                sessionLessLogs,
                "log(s) on backend have no session_id (orphaned, won't be cleaned by session DELETE)",
              );
            }
          }

          // Re-read tombstones after auto-clean above (some may have been removed)
          const liveDeletedKeys = await readDeletedSessionKeys();

          // Convert backend sessions → SessionEntry[]
          const newSessions: SessionEntry[] = [];
          for (const s of sessionsData || []) {
            if (s.status !== "completed") continue;

            const startMs = new Date(s.start_time).getTime();
            const sessionKey = String(startMs);

            // Skip sessions the user locally deleted but whose backend delete
            // hasn't landed yet (either queued in outbox or awaiting retry).
            if (liveDeletedKeys.has(sessionKey)) {
              if (__DEV__) {
                console.log("[syncFromBackend] skipping tombstoned session", sessionKey);
              }
              continue;
            }
            const durationMin = s.duration_minutes || 0;
            const h = Math.floor(durationMin / 60);
            const m = durationMin % 60;
            const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

            // Infer discipline from session logs (majority wall_type)
            const sessionLogs = logsBySession.get(String(s.id)) || [];
            const typeCounts: Record<string, number> = {};
            for (const l of sessionLogs) {
              typeCounts[l.wall_type] = (typeCounts[l.wall_type] || 0) + 1;
            }
            const discipline = (Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])[0]?.[0] || "boulder") as LogType;

            // Compute metrics from logs when available, fallback to summary
            const sends = sessionLogs.length > 0
              ? sessionLogs.filter((l: any) => ["send", "flash", "onsight"].includes(l.result)).length
              : (s.summary?.total_sends || 0);
            const bestLog = sessionLogs.reduce(
              (best: any, l: any) => (l.grade_score > (best?.grade_score || 0) ? l : best),
              null as any,
            );
            const best = bestLog?.grade_text || (s.summary?.best_grade || "—");
            const climbs = sessionLogs.length > 0
              ? sessionLogs.reduce((sum: number, l: any) => sum + (l.attempts || 1), 0)
              : (s.summary?.total_attempts || s.summary?.log_count || 0);

            newSessions.push({
              id: String(s.id),
              date: s.date,
              startTime: new Date(startMs).toISOString(),
              endTime: new Date(startMs + durationMin * 60000).toISOString(),
              duration: durationStr,
              gymName: s.gym_name || "",
              discipline,
              sessionKey,
              sends,
              best,
              climbs,
              serverId: String(s.id),
              isPublic: false,
              synced: true,
            });

            // (sessionServerIdMap already populated for ALL backend sessions
            // — including active ones — at the top of this function.)

            // Write session lists to AsyncStorage — MERGE with local to preserve media
            const byType = new Map<LogType, LocalDayLogItem[]>();
            for (const l of sessionLogs) {
              const t = l.wall_type as LogType;
              if (!byType.has(t)) byType.set(t, []);
              byType.get(t)!.push(backendLogToLocal(l));
            }
            for (const type of (["boulder", "toprope", "lead"] as LogType[])) {
              const backendItems = byType.get(type) || [];
              const localItems = await readSessionList(sessionKey, type);
              const merged = mergeSessionListPreserveLocal(backendItems, localItems);
              await writeSessionList(sessionKey, type, merged);
            }
          }

          // Write day lists to AsyncStorage — MERGE with local to preserve media
          for (const [, group] of logsByDateType) {
            const backendItems = group.logs.map(backendLogToLocal);
            const localItems = await readDayList(group.date, group.type);
            const merged = mergeSessionListPreserveLocal(backendItems, localItems);
            await writeDayList(group.date, group.type, merged);
          }

          // Rebuild aggregated LogEntry[] for Zustand
          const allLogEntries: LogEntry[] = [];
          for (const [, group] of logsByDateType) {
            const items = group.logs.map(backendLogToLocal);
            allLogEntries.push(...aggregateSends(group.date, group.type, items));
          }

          // 合并策略: 后端数据优先，但保留本地未同步的 session
          // 以及当后端 session 的 logs 尚未同步时，保留本地的统计数据
          const existingSessions = get().sessions;
          const backendKeys = new Set(newSessions.map(s => s.sessionKey));
          const localOnly = existingSessions.filter(
            s => !backendKeys.has(s.sessionKey) && (!s.synced || s.climbs > 0)
          );

          // Repair: for sessions with 0 metrics, try recomputing from AsyncStorage
          const mergedBackendSessions = await Promise.all(newSessions.map(async (bs) => {
            // First try: use Zustand local data
            const local = existingSessions.find(s => s.sessionKey === bs.sessionKey);
            if (local && local.climbs > 0 && bs.climbs === 0) {
              return { ...bs, climbs: local.climbs, sends: local.sends, best: local.best, duration: local.duration || bs.duration };
            }
            // Second try: recompute from AsyncStorage session lists
            if (bs.climbs === 0) {
              try {
                const [sb, str, sl] = await Promise.all([
                  readSessionList(bs.sessionKey, "boulder"),
                  readSessionList(bs.sessionKey, "toprope"),
                  readSessionList(bs.sessionKey, "lead"),
                ]);
                const items = [...(sb || []), ...(str || []), ...(sl || [])];
                if (items.length > 0) {
                  const sends = items.reduce((s: number, it: any) => s + inferSendCount(it), 0);
                  const isBoulder = bs.discipline === "boulder";
                  const best = isBoulder
                    ? items.map((it: any) => String(it?.grade || "")).filter((g: string) => /^V\d+/i.test(g)).sort((a, b) => vNumber(b) - vNumber(a))[0] || "V?"
                    : items.map((it: any) => String(it?.grade || "")).filter((g: string) => /^5\./.test(g)).sort((a, b) => ydsRank(b) - ydsRank(a))[0] || "5.?";
                  return { ...bs, climbs: items.reduce((sum: number, it: any) => sum + (it.attemptsTotal ?? it.attempts ?? 1), 0), sends, best };
                }
              } catch { /* best-effort */ }
            }
            return bs;
          }));

          // Also repair localOnly sessions with 0 metrics
          const repairedLocalOnly = await Promise.all(localOnly.map(async (ls) => {
            if (ls.climbs === 0) {
              try {
                const [sb, str, sl] = await Promise.all([
                  readSessionList(ls.sessionKey, "boulder"),
                  readSessionList(ls.sessionKey, "toprope"),
                  readSessionList(ls.sessionKey, "lead"),
                ]);
                const items = [...(sb || []), ...(str || []), ...(sl || [])];
                if (items.length > 0) {
                  const sends = items.reduce((s: number, it: any) => s + inferSendCount(it), 0);
                  const isBoulder = ls.discipline === "boulder";
                  const best = isBoulder
                    ? items.map((it: any) => String(it?.grade || "")).filter((g: string) => /^V\d+/i.test(g)).sort((a, b) => vNumber(b) - vNumber(a))[0] || "V?"
                    : items.map((it: any) => String(it?.grade || "")).filter((g: string) => /^5\./.test(g)).sort((a, b) => ydsRank(b) - ydsRank(a))[0] || "5.?";
                  return { ...ls, climbs: items.reduce((sum: number, it: any) => sum + (it.attemptsTotal ?? it.attempts ?? 1), 0), sends, best };
                }
              } catch { /* best-effort */ }
            }
            return ls;
          }));

          set({
            sessions: [...mergedBackendSessions, ...repairedLocalOnly].sort((a, b) => b.startTime.localeCompare(a.startTime)),
            logs: allLogEntries,
            isSyncing: false,
            hasSyncedOnce: true,
          });
          syncWidgetFromStore();
        } catch (e) {
          console.error("[syncFromBackend] FAILED:", e instanceof Error ? e.message : e,
            (e as any)?.response?.status ? `| status: ${(e as any).response.status}` : "");
          set({ isSyncing: false });
        }
      },

      startSession: (gymName, discipline, gymId) => {
        const startTime = Date.now();
        const sessionKey = String(startTime);
        const localDate = keyOf(new Date(startTime)); // YYYY-MM-DD in user's local timezone
        set({
          activeSession: { startTime, gymName, discipline, serverId: null },
        });

        // Start Live Activity (灵动岛/锁屏)
        startLiveActivity({ gymName, discipline, startTime });

        // Crash recovery: write backup snapshot (fire-and-forget)
        writeBackupSnapshot({
          sessionKey,
          date: localDate,
          gymName,
          discipline,
          startTime,
        }).catch(() => {});

        // 异步创建后端 session — promise 保存到模块变量, endSession 可 await
        const sessionPayload = {
          gym_name: gymName,
          location_type: "gym" as const,
          date: localDate,
          start_time: new Date(startTime).toISOString(),
          ...(gymId ? { gym_id: gymId } : {}),
        };

        _sessionCreatePromise = (async () => {
          try {
            const res = await api.post<{ id: string }>("/sessions", sessionPayload);
            if (res?.id) {
              const sid = String(res.id);
              const current = get().activeSession;
              if (current && String(current.startTime) === sessionKey) {
                set({ activeSession: { ...current, serverId: sid } });
              }
              await setSessionServerId(sessionKey, sid);
              return sid;
            }
            return null;
          } catch (err: any) {
            // 离线或请求失败: 入队稍后重试
            console.warn("[SESSION] Failed to create session on backend:", err?.message || err);
            await enqueueSessionEvent({
              type: "create",
              localKey: sessionKey,
              payload: sessionPayload,
            });
            return null;
          }
        })();
      },

      endSession: async () => {
        const { activeSession, sessions, logs } = get();
        if (!activeSession) return null;

        const endTime = Date.now();
        const durationMs = endTime - activeSession.startTime;
        const h = Math.floor(durationMs / 3600000);
        const m = Math.floor((durationMs % 3600000) / 60000);
        const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const sessionKey = String(activeSession.startTime);
        const sessionDate = keyOf(new Date(activeSession.startTime));

        try {
          // 1) read session lists (all 3 types)
          const [sb, str, sl] = await Promise.all([
            readSessionList(sessionKey, "boulder"),
            readSessionList(sessionKey, "toprope"),
            readSessionList(sessionKey, "lead"),
          ]);

          // 2) merge into day lists
          const [db, dtr, dl] = await Promise.all([
            readDayList(sessionDate, "boulder"),
            readDayList(sessionDate, "toprope"),
            readDayList(sessionDate, "lead"),
          ]);

          const nextDayBoulder = mergeById(db || [], sb || []);
          const nextDayToprope = mergeById(dtr || [], str || []);
          const nextDayLead = mergeById(dl || [], sl || []);

          await Promise.all([
            writeDayList(sessionDate, "boulder", nextDayBoulder),
            writeDayList(sessionDate, "toprope", nextDayToprope),
            writeDayList(sessionDate, "lead", nextDayLead),
          ]);

          // 3) rebuild aggregated day logs (for rings/weekly counts)
          const rebuilt = [
            ...aggregateSends(sessionDate, "boulder", nextDayBoulder),
            ...aggregateSends(sessionDate, "toprope", nextDayToprope),
            ...aggregateSends(sessionDate, "lead", nextDayLead),
          ];

          const kept = (logs || []).filter((l) => l.date !== sessionDate);
          const nextLogs = [...kept, ...rebuilt];

          // 4) compute session summary (per-session card)
          const sessionItems = [...(sb || []), ...(str || []), ...(sl || [])];
          const sends = sessionItems.reduce((s: number, it: any) => s + inferSendCount(it), 0);

          let best: string;
          if (activeSession.discipline === "boulder") {
            best = sessionItems
              .map((it: any) => String(it?.grade || "").trim())
              .filter((g: string) => /^V\d+/i.test(g))
              .sort((a: string, b: string) => vNumber(b) - vNumber(a))[0] || "V?";
          } else {
            best = sessionItems
              .map((it: any) => String(it?.grade || "").trim())
              .filter((g: string) => /^5\./.test(g))
              .sort((a: string, b: string) => ydsRank(b) - ydsRank(a))[0] || "5.?";
          }

          // --- 后端同步 ---
          let serverId = activeSession.serverId;
          if (!serverId && _sessionCreatePromise) {
            serverId = await _sessionCreatePromise;
            _sessionCreatePromise = null;
          }
          if (!serverId) {
            serverId = (await getSessionServerId(sessionKey)) ?? null;
          }

          if (serverId) {
            try {
              await api.post(`/sessions/${serverId}/end`, {});
            } catch {
              enqueueSessionEvent({ type: "end", localKey: sessionKey });
            }
          } else {
            enqueueSessionEvent({ type: "end", localKey: sessionKey });
          }
          // --- 后端同步结束 ---

          const newSession: SessionEntry = {
            id: Date.now().toString(),
            date: sessionDate,
            startTime: new Date(activeSession.startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: durationStr,
            gymName: activeSession.gymName,
            discipline: activeSession.discipline,

            sessionKey,
            sends,
            best,
            climbs: sessionItems.reduce((sum: number, it: any) => sum + (it.attemptsTotal ?? it.attempts ?? 1), 0),

            serverId: serverId,
            isPublic: false,
            synced: !!serverId,
          };

          // End Live Activity (灵动岛/锁屏)
          const totalAttempts = sessionItems.reduce(
            (sum: number, it: any) => sum + (it.attemptsTotal ?? it.attempts ?? 1),
            0,
          );
          endLiveActivity({
            sendCount: sends,
            bestGrade: best,
            routeCount: sessionItems.length,
            attempts: totalAttempts,
          });

          set({
            logs: nextLogs,
            sessions: [newSession, ...sessions],
            activeSession: null,
            _lastEndSessionTime: Date.now(),
          });

          clearBackupSnapshot().catch(() => {});
          syncWidgetFromStore();
          return newSession;
        } catch (err) {
          console.error("[endSession] Error:", err);

          // Fallback: create minimal session entry so calendar still shows it
          let sends = 0, climbs = 0;
          try {
            const [sb, str, sl] = await Promise.all([
              readSessionList(sessionKey, "boulder"),
              readSessionList(sessionKey, "toprope"),
              readSessionList(sessionKey, "lead"),
            ]);
            const items = [...(sb || []), ...(str || []), ...(sl || [])];
            sends = items.reduce((s: number, it: any) => s + inferSendCount(it), 0);
            climbs = items.reduce((sum: number, it: any) => sum + (it.attemptsTotal ?? it.attempts ?? 1), 0);
          } catch { /* best-effort */ }

          const fallbackSession: SessionEntry = {
            id: `fallback_${Date.now()}`,
            date: sessionDate,
            startTime: new Date(activeSession.startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration: durationStr,
            gymName: activeSession.gymName,
            discipline: activeSession.discipline,
            sessionKey,
            sends,
            best: "V?",
            climbs,
            serverId: activeSession.serverId,
            isPublic: false,
            synced: false,
          };

          // End Live Activity (fallback path) — `climbs` here is already the
          // sum of attemptsTotal across all items, so it doubles as the
          // attempts metric. routeCount is the number of distinct items.
          endLiveActivity({
            sendCount: sends,
            bestGrade: "V?",
            routeCount: climbs,
            attempts: climbs,
          });

          set({
            sessions: [fallbackSession, ...sessions],
            activeSession: null,
            _lastEndSessionTime: Date.now(),
          });

          clearBackupSnapshot().catch(() => {});
          syncWidgetFromStore();
          return fallbackSession;
        }
      },

      discardActiveSession: async () => {
        const { activeSession, logs } = get();
        if (!activeSession) return;

        const sessionKey = String(activeSession.startTime);
        const sessionDate = keyOf(new Date(activeSession.startTime));

        // 1) Await any in-flight POST /sessions so we can DELETE by serverId.
        //    Mirrors endSession's pattern.
        let serverId = activeSession.serverId;
        if (!serverId && _sessionCreatePromise) {
          try {
            serverId = await _sessionCreatePromise;
          } catch {
            serverId = null;
          }
          _sessionCreatePromise = null;
        }
        if (!serverId) {
          serverId = (await getSessionServerId(sessionKey)) ?? null;
        }

        // 2) Read session lists to collect the IDs to remove from day lists.
        const [sb, str, sl] = await Promise.all([
          readSessionList(sessionKey, "boulder"),
          readSessionList(sessionKey, "toprope"),
          readSessionList(sessionKey, "lead"),
        ]);
        const sessionItemIds = new Set(
          [...(sb || []), ...(str || []), ...(sl || [])].map((it: any) => it.id)
        );

        // 3) Subtract from day lists + clear session lists.
        const [db, dtr, dl] = await Promise.all([
          readDayList(sessionDate, "boulder"),
          readDayList(sessionDate, "toprope"),
          readDayList(sessionDate, "lead"),
        ]);
        const nextDb = (db || []).filter((it) => !sessionItemIds.has(it.id));
        const nextDtr = (dtr || []).filter((it) => !sessionItemIds.has(it.id));
        const nextDl = (dl || []).filter((it) => !sessionItemIds.has(it.id));

        await Promise.all([
          writeDayList(sessionDate, "boulder", nextDb),
          writeDayList(sessionDate, "toprope", nextDtr),
          writeDayList(sessionDate, "lead", nextDl),
          clearSessionList(sessionKey, "boulder"),
          clearSessionList(sessionKey, "toprope"),
          clearSessionList(sessionKey, "lead"),
        ]);

        // 4) Rebuild aggregated logs[] for this date.
        const rebuilt = [
          ...aggregateSends(sessionDate, "boulder", nextDb),
          ...aggregateSends(sessionDate, "toprope", nextDtr),
          ...aggregateSends(sessionDate, "lead", nextDl),
        ];
        const kept = (logs || []).filter((l) => l.date !== sessionDate);
        const nextLogs = [...kept, ...rebuilt];

        // 5) Commit state.
        set({
          logs: nextLogs,
          activeSession: null,
          _lastEndSessionTime: Date.now(),
        });

        // 6) Clean up Live Activity, backup, widget.
        endLiveActivity({ sendCount: 0, bestGrade: "", routeCount: 0, attempts: 0 });
        clearBackupSnapshot().catch(() => {});
        syncWidgetFromStore();

        // 7) Purge any queued outbox events for this session.
        await purgeSessionOutboxByKey(sessionKey).catch(() => {});
        await purgeLogsOutboxBySessionKey(sessionKey).catch(() => {});

        // 8) Backend DELETE (fire-and-forget).
        if (serverId) {
          (async () => {
            try {
              await api.del(`/sessions/${serverId}`);
            } catch (err) {
              console.warn("[discardActiveSession] backend DELETE failed:", err);
            } finally {
              await removeSessionServerId(sessionKey).catch(() => {});
            }
          })();
        } else {
          removeSessionServerId(sessionKey).catch(() => {});
        }
      },

      deleteSession: async (sessionKey) => {
        const { sessions, logs } = get();
        const session = sessions.find((s) => s.sessionKey === sessionKey);
        if (!session) return [];

        const date = session.date;

        // 0) Mark tombstone BEFORE any async work so a concurrent
        // syncFromBackend() can't re-add the session under us.
        await markSessionDeleted(sessionKey);

        // 1) read session lists to get item IDs
        const [sb, str, sl] = await Promise.all([
          readSessionList(sessionKey, "boulder"),
          readSessionList(sessionKey, "toprope"),
          readSessionList(sessionKey, "lead"),
        ]);
        const sessionItemIds = new Set(
          [...(sb || []), ...(str || []), ...(sl || [])].map((it: any) => it.id)
        );

        // 2) remove session items from day lists
        const [db, dtr, dl] = await Promise.all([
          readDayList(date, "boulder"),
          readDayList(date, "toprope"),
          readDayList(date, "lead"),
        ]);
        const nextDb = (db || []).filter((it) => !sessionItemIds.has(it.id));
        const nextDtr = (dtr || []).filter((it) => !sessionItemIds.has(it.id));
        const nextDl = (dl || []).filter((it) => !sessionItemIds.has(it.id));

        await Promise.all([
          writeDayList(date, "boulder", nextDb),
          writeDayList(date, "toprope", nextDtr),
          writeDayList(date, "lead", nextDl),
          clearSessionList(sessionKey, "boulder"),
          clearSessionList(sessionKey, "toprope"),
          clearSessionList(sessionKey, "lead"),
        ]);

        // 3) rebuild aggregated logs for this date
        const rebuilt = [
          ...aggregateSends(date, "boulder", nextDb),
          ...aggregateSends(date, "toprope", nextDtr),
          ...aggregateSends(date, "lead", nextDl),
        ];
        const kept = (logs || []).filter((l) => l.date !== date);
        const nextLogs = [...kept, ...rebuilt];

        // 4) update Zustand state
        set({
          sessions: sessions.filter((s) => s.sessionKey !== sessionKey),
          logs: nextLogs,
        });

        // 5) Backend delete. Purge any pending create/end outbox events for
        // this session first, so they don't race us and re-create the session
        // on backend after we just asked to delete it.
        await purgeSessionOutboxByKey(sessionKey);

        // Resolve serverId: prefer the in-memory session.serverId, fall back
        // to the persistent map (which is what the outbox flush path uses).
        let serverId: string | null = session.serverId;
        const inMemoryServerId = serverId;
        if (!serverId) {
          serverId = await getSessionServerId(sessionKey);
        }
        if (__DEV__) {
          console.log(
            "[deleteSession] resolve serverId — sessionKey:", sessionKey,
            "| session.serverId:", inMemoryServerId,
            "| map fallback:", serverId,
          );
        }

        if (!serverId) {
          // Session was never created on backend (offline create, or create
          // still in-flight and hasn't yet populated the map). Enqueue a
          // delete event — flush will resolve serverId later if/when create
          // completes. If it truly never existed, the flush handler drops
          // the event and clears the tombstone.
          if (__DEV__) {
            console.log("[deleteSession] no serverId → enqueueing delete event");
          }
          try {
            await enqueueSessionEvent({ type: "delete", localKey: sessionKey });
          } catch (e) {
            if (__DEV__) console.warn("[deleteSession] enqueue failed:", e);
          }
          return Array.from(sessionItemIds);
        }

        // We have a serverId → try to delete on backend immediately.
        try {
          await api.del(`/sessions/${serverId}`);
          await unmarkSessionDeleted(sessionKey);
          await removeSessionServerId(sessionKey);
          if (__DEV__) {
            console.log("[deleteSession] backend DELETE ok — tombstone cleared:", sessionKey);
          }
        } catch (err: any) {
          const status = err instanceof ApiError ? err.status : null;
          if (status === 404) {
            // Already gone server-side → desired state reached.
            await unmarkSessionDeleted(sessionKey);
            await removeSessionServerId(sessionKey);
            if (__DEV__) {
              console.log("[deleteSession] backend 404 — already gone:", sessionKey);
            }
          } else {
            // Network / transient failure → enqueue for retry. Keep tombstone
            // so syncFromBackend won't re-add this session while we wait.
            try {
              await enqueueSessionEvent({
                type: "delete",
                localKey: sessionKey,
                serverId,
              });
            } catch {}
            if (__DEV__) {
              console.warn(
                "[deleteSession] backend delete failed, enqueued:",
                "status:", status,
                "msg:", err?.message || err
              );
            }
          }
        }

        return Array.from(sessionItemIds);
      },

      toggleSessionPublic: async (sessionKey) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.sessionKey === sessionKey);
        if (!session) return;

        const newPublic = !session.isPublic;

        // 乐观更新
        set({
          sessions: sessions.map((s) =>
            s.sessionKey === sessionKey ? { ...s, isPublic: newPublic } : s
          ),
        });

        const serverId =
          session.serverId || (await getSessionServerId(sessionKey));
        if (serverId) {
          try {
            await api.post(`/sessions/${serverId}/share`, {
              public: newPublic,
            });
          } catch {
            // 失败回滚
            set({
              sessions: get().sessions.map((s) =>
                s.sessionKey === sessionKey
                  ? { ...s, isPublic: !newPublic }
                  : s
              ),
            });
          }
        }
      },

      upsertCount: ({ date, type, grade, delta }) => {
        const next = [...get().logs];
        const i = next.findIndex((l) => l.date === date && l.type === type && l.grade === grade);
        if (i >= 0) {
          const after = Math.max(0, next[i].count + delta);
          if (after === 0) next.splice(i, 1);
          else next[i] = { ...next[i], count: after };
        } else if (delta > 0) {
          next.push({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            date,
            type,
            grade,
            count: delta,
          });
        }
        set({ logs: next });
      },

      remove: (id) => set({ logs: get().logs.filter((l) => l.id !== id) }),

      resetDay: (date, type) =>
        set({
          logs: get().logs.filter((l) => !(l.date === date && (!type || l.type === type))),
        }),

      countByDateType: (date, type) =>
        get()
          .logs.filter((l) => l.date === date && l.type === type)
          .reduce((s, l) => s + l.count, 0),

      countsForWeek: (weekStart, type) => {
        const [y, m, d] = weekStart.split("-").map((n) => parseInt(n, 10));
        const start = new Date(y, (m || 1) - 1, d || 1);
        const res: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const dt = new Date(start);
          dt.setDate(start.getDate() + i);
          const k = keyOf(dt);
          res[k] = get()
            .logs.filter((l) => l.date === k && l.type === type)
            .reduce((s, l) => s + l.count, 0);
        }
        return res;
      },

      getSegmentsByDate: (date, type) => buildSegments(get().logs, date, type),
      getHashByDate: (date, type) => hashSegments(buildSegments(get().logs, date, type)),
    }),
    {
      name: "climb-logs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        logs: s.logs,
        sessions: s.sessions,
        activeSession: s.activeSession,
        hasSyncedOnce: s.hasSyncedOnce,
        // _hydrated intentionally excluded — always starts false
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);

export default useLogsStore;

export function useSegmentsByDate(date: string, type?: LogType): GradeCount[] {
  return useLogsStore(useCallback((s) => s.getSegmentsByDate(date, type), [date, type]), shallow);
}

export function useHashByDate(date: string, type?: LogType): string {
  return useLogsStore(useCallback((s) => s.getHashByDate(date, type), [date, type]), shallow);
}
