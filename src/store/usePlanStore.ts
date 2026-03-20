// app/store/usePlanStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { plansApi } from "../features/plans/api";
import type { PlanDetailOut } from "../features/plans/types";

// ==== Constants ====
const PROGRESS_KEY_PREFIX = "@progress_";

export const toDateString = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

type PlanStore = {
  // === Active plan (from backend) ===
  activePlan: PlanDetailOut | null;
  activePlanLoading: boolean;
  fetchActivePlan: () => Promise<void>;
  clearActivePlan: () => void;

  // === Monthly progress cache (ring indicator) ===
  monthAnchor: Date | null;
  monthMap: Record<string, number>;

  // Actions
  buildMonthMap: (monthAnyDay: Date) => Promise<void>;
  syncProgress: (date: Date, total: number, doneCount: number, newProgress: boolean[]) => Promise<void>;
  readProgress: (date: Date, total: number) => Promise<boolean[]>;
  percentForDate: (date: Date) => Promise<number>;
};

export const usePlanStore = create<PlanStore>()(
  persist(
    (set) => ({
      // === Active plan ===
      activePlan: null,
      activePlanLoading: false,

      fetchActivePlan: async () => {
        set({ activePlanLoading: true });
        try {
          const plan = await plansApi.getActivePlan();
          set({ activePlan: plan ?? null });
        } catch {
          // On failure, keep existing value (offline fallback)
        } finally {
          set({ activePlanLoading: false });
        }
      },

      clearActivePlan: () => set({ activePlan: null }),

      // === Monthly progress (unchanged from original) ===
      monthAnchor: null,
      monthMap: {},

      readProgress: async (d: Date, total: number) => {
        try {
          const key = PROGRESS_KEY_PREFIX + toDateString(d);
          const raw = await AsyncStorage.getItem(key);
          const arr = raw ? JSON.parse(raw) : [];
          if (Array.isArray(arr)) {
            if (arr.length < total) return [...arr, ...Array(total - arr.length).fill(false)];
            return arr.slice(0, total);
          }
          return Array(total).fill(false);
        } catch {
          return Array(total).fill(false);
        }
      },

      syncProgress: async (d: Date, total: number, doneCount: number, newProgress: boolean[]) => {
        const k = toDateString(d);

        const key = PROGRESS_KEY_PREFIX + k;
        await AsyncStorage.setItem(key, JSON.stringify(newProgress));

        const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

        set((s) => ({
          monthMap: { ...s.monthMap, [k]: pct }
        }));
      },

      percentForDate: async (d: Date) => {
        try {
            const key = PROGRESS_KEY_PREFIX + toDateString(d);
            const raw = await AsyncStorage.getItem(key);
            if (!raw) return 0;

            const arr = JSON.parse(raw);
            if (!Array.isArray(arr) || arr.length === 0) return 0;

            const done = arr.filter(Boolean).length;
            return Math.round((done / arr.length) * 100);
        } catch {
            return 0;
        }
      },

      buildMonthMap: async (monthAnyDay: Date) => {
        const y = monthAnyDay.getFullYear();
        const m = monthAnyDay.getMonth();
        const last = new Date(y, m + 1, 0).getDate();
        const map: Record<string, number> = {};

        const keys = [];
        for (let d = 1; d <= last; d++) {
            keys.push(PROGRESS_KEY_PREFIX + toDateString(new Date(y, m, d)));
        }

        try {
            const pairs = await AsyncStorage.multiGet(keys);
            pairs.forEach(([key, val]) => {
                if (val) {
                    const arr = JSON.parse(val);
                    const done = arr.filter(Boolean).length;
                    const total = arr.length;
                    const dateStr = key.replace(PROGRESS_KEY_PREFIX, "");
                    map[dateStr] = total > 0 ? Math.round((done / total) * 100) : 0;
                }
            });
        } catch (e) {
            console.error(e);
        }

        set({ monthMap: map, monthAnchor: new Date(y, m, 1) });
      },
    }),
    {
      name: "plan-status-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ monthMap: state.monthMap }),
    }
  )
);
