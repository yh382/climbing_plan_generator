import type { LogEntry, LogType, StackedBarItem } from "./types";
import { getGradeColor } from "./gradeAnalyzer";

const BOULDER_COLORS = { easy: "#B8C8B8", mid: "#306E6F", hard: "#5A5050" };
const ROPE_COLORS = {
  beginner: "#B8C8B8",
  intermediate: "#78A28C",
  advanced: "#306E6F",
  expert: "#5A5050",
  elite: "#8B6F5C",
};

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function categorizeBoulder(grade: string): string {
  const match = grade.match(/V(\d+)/i);
  if (!match) return "easy";
  const num = parseInt(match[1], 10);
  if (num <= 2) return "easy";
  if (num <= 5) return "mid";
  return "hard";
}

function categorizeRope(grade: string): string {
  if (/^5\.[6-9]/.test(grade)) return "beginner";
  if (grade.startsWith("5.10")) return "intermediate";
  if (grade.startsWith("5.11")) return "advanced";
  if (grade.startsWith("5.12")) return "expert";
  if (/^5\.1[3-5]/.test(grade)) return "elite";
  return "beginner";
}

function buildBoulderStack(filteredLogs: LogEntry[]): { value: number; color: string }[] {
  let easy = 0;
  let mid = 0;
  let hard = 0;
  for (const l of filteredLogs) {
    if (l.type !== "boulder") continue;
    const cat = categorizeBoulder(l.grade);
    if (cat === "easy") easy += l.count;
    else if (cat === "mid") mid += l.count;
    else hard += l.count;
  }
  return [
    { value: easy, color: BOULDER_COLORS.easy },
    { value: mid, color: BOULDER_COLORS.mid },
    { value: hard, color: BOULDER_COLORS.hard },
  ];
}

function buildRopeStack(filteredLogs: LogEntry[]): { value: number; color: string }[] {
  let c1 = 0;
  let c2 = 0;
  let c3 = 0;
  let c4 = 0;
  let c5 = 0;
  for (const l of filteredLogs) {
    if (l.type === "boulder") continue;
    const cat = categorizeRope(l.grade);
    if (cat === "beginner") c1 += l.count;
    else if (cat === "intermediate") c2 += l.count;
    else if (cat === "advanced") c3 += l.count;
    else if (cat === "expert") c4 += l.count;
    else c5 += l.count;
  }
  return [
    { value: c1, color: ROPE_COLORS.beginner },
    { value: c2, color: ROPE_COLORS.intermediate },
    { value: c3, color: ROPE_COLORS.advanced },
    { value: c4, color: ROPE_COLORS.expert },
    { value: c5, color: ROPE_COLORS.elite },
  ];
}

function buildStack(
  filteredLogs: LogEntry[],
  type: LogType
): { value: number; color: string }[] {
  return type === "boulder"
    ? buildBoulderStack(filteredLogs)
    : buildRopeStack(filteredLogs);
}

/**
 * Build stacked bar data compatible with react-native-gifted-charts BarChart.
 */
export function buildStackedBarData(
  logs: LogEntry[],
  timeRange: "W" | "M" | "Y",
  type: LogType
): StackedBarItem[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: StackedBarItem[] = [];

  if (timeRange === "W") {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toKey(d);
      const dayLogs = logs.filter((l) => l.date === dateStr);
      result.push({ stacks: buildStack(dayLogs, type), label: labels[i] });
    }
  } else if (timeRange === "M") {
    const year = today.getFullYear();
    const month = today.getMonth();
    const weeks: [number, number][] = [
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 31],
    ];

    for (let idx = 0; idx < weeks.length; idx++) {
      const [start, end] = weeks[idx];
      const rangeDates: string[] = [];
      for (let i = start; i <= end; i++) {
        const d = new Date(year, month, i);
        if (d.getMonth() === month) rangeDates.push(toKey(d));
      }
      const weekLogs = logs.filter((l) => rangeDates.includes(l.date));
      result.push({ stacks: buildStack(weekLogs, type), label: `W${idx + 1}` });
    }
  } else {
    const year = today.getFullYear();
    const labels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

    for (let i = 0; i < 12; i++) {
      const prefix = `${year}-${pad(i + 1)}`;
      const monthLogs = logs.filter((l) => l.date.startsWith(prefix));
      result.push({ stacks: buildStack(monthLogs, type), label: labels[i] });
    }
  }

  return result;
}

/**
 * Calculate Y axis max value (rounded up to a nice number).
 */
export function calculateYAxisMax(data: StackedBarItem[]): number {
  let max = 0;
  for (const item of data) {
    const total = item.stacks.reduce((sum, s) => sum + s.value, 0);
    if (total > max) max = total;
  }
  return Math.max(4, Math.ceil(max / 4) * 4);
}
