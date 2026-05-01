// src/features/analysis/useVolumeSlots.ts
//
// Builds the slot array consumed by TrainingVolumeChartView. Pulls W/M/Y +
// boulder/rope grade categorization out of the chart component so the native
// view only renders pre-aggregated data.

import { useMemo } from "react";
import type { LogEntry } from "../../store/useLogsStore";
import { toDateString } from "../../store/usePlanStore";
import type { DailyIntensityStore } from "../../services/stats/intensityCalculator";

export type TimeRange = "W" | "M" | "Y";
export type LogType = "boulder" | "rope";

export type VolumeSlot = {
  slotKey: string;
  label: string;
  isCurrent: boolean;
  isFuture: boolean;

  // Boulder buckets (4)
  boulderEasy: number;
  boulderMid: number;
  boulderHard: number;
  boulderElite: number;

  // Rope buckets (5)
  ropeBeginner: number;
  ropeIntermediate: number;
  ropeAdvanced: number;
  ropeExpert: number;
  ropeElite: number;

  // Avg intensity 0..1 across selected types for this slot
  intensity: number;
};

function categorizeBoulder(grade: string): "easy" | "mid" | "hard" | "elite" {
  const match = grade.match(/V(\d+)/i);
  if (!match) return "easy";
  const num = parseInt(match[1], 10);
  if (num <= 2) return "easy";
  if (num <= 5) return "mid";
  if (num <= 8) return "hard";
  return "elite";
}

function categorizeRope(
  grade: string
): "beginner" | "intermediate" | "advanced" | "expert" | "elite" {
  if (/^5\.[6-9]/.test(grade)) return "beginner";
  if (grade.startsWith("5.10")) return "intermediate";
  if (grade.startsWith("5.11")) return "advanced";
  if (grade.startsWith("5.12")) return "expert";
  if (/^5\.1[3-5]/.test(grade)) return "elite";
  return "beginner";
}

function emptyBuckets() {
  return {
    boulderEasy: 0,
    boulderMid: 0,
    boulderHard: 0,
    boulderElite: 0,
    ropeBeginner: 0,
    ropeIntermediate: 0,
    ropeAdvanced: 0,
    ropeExpert: 0,
    ropeElite: 0,
  };
}

function aggregate(
  filteredLogs: LogEntry[]
): ReturnType<typeof emptyBuckets> {
  const b = emptyBuckets();
  for (const l of filteredLogs) {
    if (l.type === "boulder") {
      const cat = categorizeBoulder(l.grade);
      if (cat === "easy") b.boulderEasy += l.count;
      else if (cat === "mid") b.boulderMid += l.count;
      else if (cat === "hard") b.boulderHard += l.count;
      else b.boulderElite += l.count;
    } else {
      // toprope OR lead → rope bucket
      const cat = categorizeRope(l.grade);
      if (cat === "beginner") b.ropeBeginner += l.count;
      else if (cat === "intermediate") b.ropeIntermediate += l.count;
      else if (cat === "advanced") b.ropeAdvanced += l.count;
      else if (cat === "expert") b.ropeExpert += l.count;
      else b.ropeElite += l.count;
    }
  }
  return b;
}

function avgIntensity(
  dates: string[],
  intensityData: DailyIntensityStore,
  selectedTypes: LogType[]
): number {
  let sum = 0;
  let count = 0;
  for (const d of dates) {
    const dayData = intensityData[d];
    if (!dayData) continue;
    let daySum = 0;
    let dayCount = 0;
    if (selectedTypes.includes("boulder") && dayData.boulder) {
      daySum += dayData.boulder.value;
      dayCount++;
    }
    if (selectedTypes.includes("rope") && dayData.rope) {
      daySum += dayData.rope.value;
      dayCount++;
    }
    if (dayCount > 0) {
      sum += daySum / dayCount;
      count++;
    }
  }
  return count === 0 ? 0 : Math.round((sum / count) * 100) / 100;
}

const W_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const Y_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function buildVolumeSlots(
  logs: LogEntry[],
  intensityData: DailyIntensityStore,
  timeRange: TimeRange,
  selectedTypes: LogType[]
): VolumeSlot[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeRange === "W") {
    // Monday-anchored week containing today
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);

    const slots: VolumeSlot[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toDateString(d);
      const isToday = d.getTime() === today.getTime();
      const isFuture = d.getTime() > today.getTime();
      const dayLogs = logs.filter((l) => l.date === dateStr);
      slots.push({
        slotKey: dateStr,
        label: W_LABELS[i],
        isCurrent: isToday,
        isFuture,
        ...aggregate(dayLogs),
        intensity: isFuture ? 0 : avgIntensity([dateStr], intensityData, selectedTypes),
      });
    }
    return slots;
  }

  if (timeRange === "M") {
    const year = today.getFullYear();
    const month = today.getMonth();
    const weekRanges: [number, number][] = [
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 31],
    ];
    return weekRanges.map((range, idx) => {
      const dates: string[] = [];
      for (let i = range[0]; i <= range[1]; i++) {
        const d = new Date(year, month, i);
        if (d.getMonth() === month) dates.push(toDateString(d));
      }
      const isCurrentWeek =
        today.getDate() >= range[0] && today.getDate() <= range[1];
      const isFuture = today.getDate() < range[0];
      const weekLogs = logs.filter((l) => dates.includes(l.date));
      return {
        slotKey: `W${idx + 1}`,
        label: `W${idx + 1}`,
        isCurrent: isCurrentWeek,
        isFuture,
        ...aggregate(weekLogs),
        intensity: isFuture ? 0 : avgIntensity(dates, intensityData, selectedTypes),
      };
    });
  }

  // timeRange === "Y"
  const year = today.getFullYear();
  return Array.from({ length: 12 }, (_, i) => {
    const monthPrefix = `${year}-${String(i + 1).padStart(2, "0")}`;
    const isCurrentMonth = i === today.getMonth();
    const isFuture = i > today.getMonth();
    const monthDates = Object.keys(intensityData).filter((k) =>
      k.startsWith(monthPrefix)
    );
    const monthLogs = logs.filter((l) => l.date.startsWith(monthPrefix));
    return {
      slotKey: monthPrefix,
      label: Y_LABELS[i],
      isCurrent: isCurrentMonth,
      isFuture,
      ...aggregate(monthLogs),
      intensity: isFuture ? 0 : avgIntensity(monthDates, intensityData, selectedTypes),
    };
  });
}

export function useVolumeSlots(
  logs: LogEntry[],
  intensityData: DailyIntensityStore,
  timeRange: TimeRange,
  selectedTypes: LogType[]
): VolumeSlot[] {
  return useMemo(
    () => buildVolumeSlots(logs, intensityData, timeRange, selectedTypes),
    [logs, intensityData, timeRange, selectedTypes]
  );
}
