// app/store/useLogsStore.ts
import { createWithEqualityFn } from "zustand/traditional";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {shallow} from "zustand/shallow";
import { useCallback } from "react";

// 你现有的日志模型：每天某个等级的“次数”
export type LogType = "boulder" | "yds";

export type LogEntry = {
  id: string;
  date: string;      // YYYY-MM-DD
  type: LogType;     // "boulder" | "yds"
  grade: string;     // V* 或 5.*
  count: number;     // 当天该等级的次数聚合
};

// 👇 新增：MiniRing/大环通用的分段类型
export type GradeCount = { grade: string; count: number };

type LogsState = {
  logs: LogEntry[];

  // 写入/修改
  upsertCount: (p: { date: string; type: LogType; grade: string; delta: number }) => void;
  remove: (id: string) => void;
  resetDay: (date: string, type?: LogType) => void;

  // 读取（你原来的）
  countByDateType: (date: string, type: LogType) => number;
  countsForWeek: (weekStart: string, type: LogType) => Record<string, number>;

  // 👇 新增：提供给 MiniRing/大环直接使用的选择器
  // 如果 type 省略：返回当天“全部类型（boulder+yds）”合并后的 {grade,count}[]
  getSegmentsByDate: (date: string, type?: LogType) => GradeCount[];
  // 若 type 省略：对“全部类型”的分段做哈希
  getHashByDate: (date: string, type?: LogType) => string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 👇 新增：稳定哈希，用于 memo/缓存
function hashSegments(list: GradeCount[]): string {
  if (!list?.length) return "0";
  // 确保顺序稳定：按 grade 排序后序列化
  return [...list]
    .sort((a, b) => a.grade.localeCompare(b.grade))
    .map(({ grade, count }) => `${grade}:${count}`)
    .join("|");
}

// 👇 新增：把 logs 过滤/合并成 {grade,count}[]
function buildSegments(logs: LogEntry[], date: string, type?: LogType): GradeCount[] {
  const filtered = logs.filter(l => l.date === date && (!type || l.type === type));
  if (!filtered.length) return [];
  // 注意：如果同一天不同类型的 grade 文本相同（例如 "V5" 与 "5.11" 不会冲突；
  // 但两个相同的 "V5" 来自不同记录会在这里合并，这是我们想要的）
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

      upsertCount: ({ date, type, grade, delta }) => {
        const next = [...get().logs];
        const i = next.findIndex((l) => l.date === date && l.type === type && l.grade === grade);
        if (i >= 0) {
          const after = Math.max(0, next[i].count + delta);
          if (after === 0) {
            next.splice(i, 1); // 归零则删掉这条聚合
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

      // 👇 新增：核心选择器
      getSegmentsByDate: (date, type) => buildSegments(get().logs, date, type),
      getHashByDate: (date, type) => hashSegments(buildSegments(get().logs, date, type)),
    }),
    {
      name: "climb-logs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ logs: s.logs }), // 只持久化 logs
    }
  )
);

export default useLogsStore;

// 👇（可选但推荐）：在组件里更好用的 Hook 选择器
// 使用时：const segments = useSegmentsByDate(dateKey); // 合并两种类型
// 或 const segments = useSegmentsByDate(dateKey, "boulder"); // 指定类型
export function useSegmentsByDate(date: string, type?: LogType): GradeCount[] {
  return useLogsStore(useCallback((s) => s.getSegmentsByDate(date, type), [date, type]), shallow);
}

export function useHashByDate(date: string, type?: LogType): string {
  return useLogsStore(useCallback((s) => s.getHashByDate(date, type), [date, type]), shallow);
}

