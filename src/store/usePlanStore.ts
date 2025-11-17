// app/store/usePlanStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseISO } from "date-fns";

// ==== 类型（和你项目里已有类型保持一致即可） ====
export type WeekDaysKey = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
export type I18N = string | { zh: string; en: string };
export type PlanItem = { label: I18N; target: I18N };
export type PlanDay = { title: I18N; items: PlanItem[] };
export type Plan = {
  days: Record<WeekDaysKey, PlanDay>;
  weeks?: Array<{ week: number; days: Record<WeekDaysKey, PlanDay> }>;
  meta?: { start_date?: string };
};

// ==== 常量 & 工具 ====
const PROGRESS_KEY_PREFIX = "@progress_";
const PLAN_KEY = "@plan_json";
const weekdayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const toDateString = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const diffInWeeks = (start: Date, current: Date) => {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const c = new Date(current.getFullYear(), current.getMonth(), current.getDate()).getTime();
  return Math.floor((c - s) / (7 * 24 * 3600 * 1000));
};

// ==== Store 接口 ====
type PlanStore = {
  plan: Plan | null;

  // 缓存本月百分比（外环用），非持久化
  monthAnchor: Date | null;
  monthMap: Record<string, number>;

  // 加载/保存 plan
  loadPlan: () => Promise<void>;
  setPlan: (p: Plan | null) => Promise<void>;

  // 读取/计算
  itemsForDate: (d: Date) => PlanItem[];
  readProgressArray: (d: Date, total: number) => Promise<boolean[]>;
  writeProgressArray: (d: Date, arr: boolean[]) => Promise<void>;

  // 百分比（单天 + 整月）
  percentForDate: (d: Date) => Promise<number>;
  buildMonthMap: (monthAnyDay: Date) => Promise<void>;

  // 勾选项操作（更新存储并刷新当前月缓存）
  setProgressAt: (d: Date, idx: number, done: boolean) => Promise<void>;
  toggleProgressAt: (d: Date, idx: number) => Promise<void>;
};

export const usePlanStore = create<PlanStore>()(
  persist(
    (set, get) => ({
      plan: null,
      monthAnchor: null,
      monthMap: {},

      // 载入/保存 plan （与 Calendar 使用同一个键）
      loadPlan: async () => {
        const raw = await AsyncStorage.getItem(PLAN_KEY);
        const p = raw ? (JSON.parse(raw) as Plan) : null;
        set({ plan: p });
      },
      setPlan: async (p) => {
        if (p) {
          await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(p));
        } else {
          await AsyncStorage.removeItem(PLAN_KEY);
        }
        set({ plan: p });
      },

      // 任意日期的 items（优先 weeks+start_date，回退 days）
      itemsForDate: (d: Date) => {
        const plan = get().plan;
        if (!plan) return [];
        const wd = weekdayKey[d.getDay()] as WeekDaysKey;
        if (plan.weeks && plan.weeks.length && plan.meta?.start_date) {
          const start = parseISO(plan.meta.start_date)!;
          const wIdx = diffInWeeks(start, d);
          if (wIdx >= 0 && wIdx < (plan.weeks?.length ?? 0)) {
            const maybe = plan.weeks[wIdx]?.days?.[wd]?.items ?? [];
            if (maybe?.length) return maybe;
          }
        }
        return plan.days?.[wd]?.items ?? [];
      },

      // 当天进度布尔数组（长度裁剪为 total）
      readProgressArray: async (d: Date, total: number) => {
        const key = PROGRESS_KEY_PREFIX + toDateString(d);
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? (JSON.parse(raw) as boolean[]) : [];
        const safe = Array.from({ length: total }, (_, i) => !!arr[i]);
        return safe;
      },
      writeProgressArray: async (d: Date, arr: boolean[]) => {
        const key = PROGRESS_KEY_PREFIX + toDateString(d);
        await AsyncStorage.setItem(key, JSON.stringify(arr));
      },

      // 单天百分比
      percentForDate: async (d: Date) => {
        const items = get().itemsForDate(d);
        const total = items.length;
        if (!total) return 0;
        const arr = await get().readProgressArray(d, total);
        const done = arr.filter(Boolean).length;
        return Math.round((done / total) * 100);
      },

      // 构建整月 map，并写入 store
      buildMonthMap: async (monthAnyDay: Date) => {
        const y = monthAnyDay.getFullYear();
        const m = monthAnyDay.getMonth();
        const last = new Date(y, m + 1, 0).getDate();
        const map: Record<string, number> = {};
        for (let d = 1; d <= last; d++) {
          const dt = new Date(y, m, d);
          map[toDateString(dt)] = await get().percentForDate(dt);
        }
        set({ monthMap: map, monthAnchor: new Date(y, m, 1) });
      },

      // 勾选写入 & 刷新当前月缓存
      setProgressAt: async (d: Date, idx: number, done: boolean) => {
        const items = get().itemsForDate(d);
        const arr = await get().readProgressArray(d, items.length);
        arr[idx] = done;
        await get().writeProgressArray(d, arr);

        // 若当前月缓存存在且同月，刷新对应日期的百分比；否则不动
        const anchor = get().monthAnchor;
        if (anchor && anchor.getFullYear() === d.getFullYear() && anchor.getMonth() === d.getMonth()) {
          const pct = await get().percentForDate(d);
          set((s) => ({ monthMap: { ...s.monthMap, [toDateString(d)]: pct } }));
        }
      },

      toggleProgressAt: async (d: Date, idx: number) => {
        const items = get().itemsForDate(d);
        const arr = await get().readProgressArray(d, items.length);
        arr[idx] = !arr[idx];
        await get().writeProgressArray(d, arr);

        const anchor = get().monthAnchor;
        if (anchor && anchor.getFullYear() === d.getFullYear() && anchor.getMonth() === d.getMonth()) {
          const pct = await get().percentForDate(d);
          set((s) => ({ monthMap: { ...s.monthMap, [toDateString(d)]: pct } }));
        }
      },
    }),
    {
      name: "plan-store",
      storage: createJSONStorage(() => AsyncStorage),
      // 持久化里仅保存 plan；monthMap/monthAnchor 属于易失缓存，不必持久化
      partialize: (state) => ({ plan: state.plan }),
    }
  )
);
