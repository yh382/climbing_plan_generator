import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalDayLogItem } from "../../features/journal/loglist/types";
import { readDayList } from "../../features/journal/loglist/storage";

// ── Types ──

export type IntensityEntry = {
  value: number;   // 0-1
  n: number;       // number of log items
  attempts: number; // total attempts across items
  sends: number;   // total sends across items
};

export type DailyIntensityStore = Record<
  string,
  { boulder?: IntensityEntry; rope?: IntensityEntry }
>;

const STORAGE_KEY = "@daily_intensity";

// ── Helpers ──

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const FEEL_SCORE: Record<string, number> = { hard: 1, solid: 0.5, soft: 0 };

// ── Core Algorithm ──

/**
 * Compute intensity for a set of log items (single type, single day).
 * Returns null if items is empty — chart should skip that day.
 */
export function computeDailyIntensity(
  items: LocalDayLogItem[]
): IntensityEntry | null {
  if (items.length === 0) return null;

  let totalAttempts = 0;
  let totalSends = 0;
  let weightedEffortSum = 0;
  let weightSum = 0;

  let feelSum = 0;
  let nFeel = 0;

  for (const item of items) {
    const att = item.attemptsTotal ?? item.attempts ?? 1;
    const sends = item.sendCount ?? 0;
    const isSend = sends > 0;

    // Per-entry effort
    const effort = isSend
      ? clamp((att - 1) / 2, 0, 1)
      : clamp(att / 3, 0, 1);

    const weight = att || 1;
    weightedEffortSum += effort * weight;
    weightSum += weight;

    totalAttempts += att;
    totalSends += sends;

    // Feel
    if (item.feel && item.feel in FEEL_SCORE) {
      feelSum += FEEL_SCORE[item.feel];
      nFeel++;
    }
  }

  // Day-level effort (weighted average)
  const dayEffort = weightSum > 0 ? weightedEffortSum / weightSum : 0;

  // Day-level feel with confidence mixing
  const feelAvg = nFeel > 0 ? feelSum / nFeel : 0.5;
  const confidence = clamp(nFeel / 4, 0, 1);
  const feelScore = confidence * feelAvg + (1 - confidence) * 0.5;

  // Final intensity
  const value = clamp(0.4 * feelScore + 0.6 * dayEffort, 0, 1);

  return {
    value: Math.round(value * 1000) / 1000, // 3 decimal places
    n: items.length,
    attempts: totalAttempts,
    sends: totalSends,
  };
}

// ── Storage Helpers ──

export async function loadIntensityData(): Promise<DailyIntensityStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveIntensityForDate(
  date: string,
  type: "boulder" | "toprope" | "lead",
  result: IntensityEntry
): Promise<void> {
  try {
    const store = await loadIntensityData();
    const key = type === "boulder" ? "boulder" : "rope";
    if (!store[date]) store[date] = {};
    store[date][key] = result;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // best-effort
  }
}

/**
 * Backfill intensity for all given dates that don't already have data.
 * Reads full LocalDayLogItem from AsyncStorage for each missing date.
 * Returns the complete (possibly updated) store.
 */
export async function backfillIntensityData(
  dates: string[]
): Promise<DailyIntensityStore> {
  const store = await loadIntensityData();
  let changed = false;

  for (const date of dates) {
    // Boulder
    if (!store[date]?.boulder) {
      const items = await readDayList(date, "boulder");
      const result = computeDailyIntensity(items);
      if (result) {
        if (!store[date]) store[date] = {};
        store[date].boulder = result;
        changed = true;
      }
    }
    // Rope (toprope + lead combined)
    if (!store[date]?.rope) {
      const [trItems, leadItems] = await Promise.all([
        readDayList(date, "toprope"),
        readDayList(date, "lead"),
      ]);
      const allRope = [...trItems, ...leadItems];
      const result = computeDailyIntensity(allRope);
      if (result) {
        if (!store[date]) store[date] = {};
        store[date].rope = result;
        changed = true;
      }
    }
  }

  if (changed) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  return store;
}
