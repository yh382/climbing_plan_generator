// src/store/useLogsStore.ts
import { createWithEqualityFn } from "zustand/traditional";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {shallow} from "zustand/shallow";
import { useCallback } from "react";

// 你现有的日志模型
export type LogType = "boulder" | "yds";

export type LogEntry = {
  id: string;
  date: string;      // YYYY-MM-DD
  type: LogType;     // "boulder" | "yds"
  grade: string;     // V* 或 5.*
  count: number;     // 当天该等级的次数聚合
};

// 👇 新增：Session 模型 (记录一次去岩馆的完整行程)
export type SessionEntry = {
  id: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // ISO
  endTime: string;    // ISO
  duration: string;   // "2h 30m"
  gymName: string;
};

// MiniRing/大环通用的分段类型
export type GradeCount = { grade: string; count: number };

type LogsState = {
  logs: LogEntry[];
  
  // 👇 新增：Session 相关状态
  sessions: SessionEntry[]; 
  activeSession: { startTime: number; gymName: string } | null;

  // 写入/修改 (原有)
  upsertCount: (p: { date: string; type: LogType; grade: string; delta: number }) => void;
  remove: (id: string) => void;
  resetDay: (date: string, type?: LogType) => void;

  // 👇 新增：Session 操作
  startSession: (gymName: string) => void;
  endSession: () => Promise<SessionEntry | null>;

  // 读取 (原有)
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
  const filtered = logs.filter(l => l.date === date && (!type || l.type === type));
  if (!filtered.length) return [];
  const map = new Map<string, number>();
  for (const l of filtered) {
    const key = l.grade || "unknown";
    map.set(key, (map.get(key) ?? 0) + (l.count ?? 0));
  }
  return Array.from(map.entries()).map(([grade, count]) => ({ grade, count }));
}

const useLogsStore = createWithEqualityFn<LogsState>()(
  persist(
    (set, get) => ({
      logs: [],
      sessions: [],        // [新增]
      activeSession: null, // [新增]

      // [新增] 开始计时
      startSession: (gymName) => {
        set({
          activeSession: {
            startTime: Date.now(),
            gymName,
          },
        });
      },

      // [新增] 结束计时并保存
      endSession: async () => {
        const { activeSession, sessions } = get();
        if (!activeSession) return null;

        const endTime = Date.now();
        const durationMs = endTime - activeSession.startTime;
        const h = Math.floor(durationMs / 3600000);
        const m = Math.floor((durationMs % 3600000) / 60000);
        const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

        const newSession: SessionEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          startTime: new Date(activeSession.startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: durationStr,
          gymName: activeSession.gymName,
        };

        set({
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
          if (after === 0) {
            next.splice(i, 1);
          } else {
            next[i] = { ...next[i], count: after };
          }
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
      // [修改] 持久化 logs, sessions 和 activeSession (以防杀后台丢失进度)
      partialize: (s) => ({ 
        logs: s.logs, 
        sessions: s.sessions, 
        activeSession: s.activeSession 
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