// src/store/useLogsStore.ts
import { createWithEqualityFn } from "zustand/traditional";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { shallow } from "zustand/shallow";
import { useCallback } from "react";

// ✅ 关键：结束 session 时，把 sessionList 落到 dayList，并生成 session summary
import {
  readSessionList,
  // clearSessionList,  // 先不清，便于 per-session detail 点击进入（你后面要清也可以）
  readDayList,
  writeDayList,
} from "../features/journal/loglist/storage";

export type LogType = "boulder" | "yds";

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

  // ✅ NEW: 用于 calendar 每张卡 session 维度展示/跳转
  sessionKey: string; // String(activeSession.startTime)
  sends: number;      // 本 session sends
  best: string;       // 本 session best（优先 V，否则 YDS）
};

export type GradeCount = { grade: string; count: number };

type LogsState = {
  logs: LogEntry[];

  sessions: SessionEntry[];
  activeSession: { startTime: number; gymName: string } | null;

  upsertCount: (p: { date: string; type: LogType; grade: string; delta: number }) => void;
  remove: (id: string) => void;
  resetDay: (date: string, type?: LogType) => void;

  startSession: (gymName: string) => void;
  endSession: () => Promise<SessionEntry | null>;

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

const useLogsStore = createWithEqualityFn<LogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      sessions: [],
      activeSession: null,

      startSession: (gymName) => {
        set({
          activeSession: { startTime: Date.now(), gymName },
        });
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
        const sessionDate = new Date(activeSession.startTime).toISOString().split("T")[0];

        // 1) read session lists
        const [sb, sr] = await Promise.all([
          readSessionList(sessionKey, "boulder"),
          readSessionList(sessionKey, "yds"),
        ]);

        // 2) merge into day lists
        const [db, dr] = await Promise.all([
          readDayList(sessionDate, "boulder"),
          readDayList(sessionDate, "yds"),
        ]);

        const nextDayBoulder = mergeById(db || [], sb || []);
        const nextDayRoutes = mergeById(dr || [], sr || []);

        await Promise.all([
          writeDayList(sessionDate, "boulder", nextDayBoulder),
          writeDayList(sessionDate, "yds", nextDayRoutes),
        ]);

        // 3) rebuild aggregated day logs (for rings/weekly counts)
        const rebuilt = [
          ...aggregateSends(sessionDate, "boulder", nextDayBoulder),
          ...aggregateSends(sessionDate, "yds", nextDayRoutes),
        ];

        const kept = (logs || []).filter((l) => l.date !== sessionDate);
        const nextLogs = [...kept, ...rebuilt];

        // 4) compute session summary (per-session card)
        const sessionItems = [...(sb || []), ...(sr || [])];
        const sends = sessionItems.reduce((s: number, it: any) => s + inferSendCount(it), 0);

        let best = "V?";
        const bBest = sessionItems
          .map((it: any) => String(it?.grade || "").trim())
          .filter((g: string) => /^V\d+/i.test(g))
          .sort((a: string, b: string) => vNumber(b) - vNumber(a))[0];

        if (bBest) {
          best = bBest;
        } else {
          const rBest = sessionItems
            .map((it: any) => String(it?.grade || "").trim())
            .filter((g: string) => /^5\./.test(g))
            .sort((a: string, b: string) => ydsRank(b) - ydsRank(a))[0];
          best = rBest || "V?";
        }

        const newSession: SessionEntry = {
          id: Date.now().toString(),
          date: sessionDate,
          startTime: new Date(activeSession.startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: durationStr,
          gymName: activeSession.gymName,

          sessionKey,
          sends,
          best,
        };

        set({
          logs: nextLogs,
          sessions: [newSession, ...sessions],
          activeSession: null,
        });

        return newSession;
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
      }),
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
