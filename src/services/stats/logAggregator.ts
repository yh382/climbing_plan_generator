import type { LogEntry, LogType, DailyAggregate, WeeklyAggregate, MonthlyAggregate } from "./types";
import { getGradeColor, getGradeScore } from "./gradeAnalyzer";

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function buildDailyAggregate(logs: LogEntry[], date: string): DailyAggregate {
  const dayLogs = logs.filter((l) => l.date === date);
  const grades: Record<string, { count: number; type: LogType }> = {};
  let boulderCount = 0;
  let ropeCount = 0;

  for (const l of dayLogs) {
    if (l.type === "boulder") boulderCount += l.count;
    else ropeCount += l.count;

    if (!grades[l.grade]) grades[l.grade] = { count: 0, type: l.type };
    grades[l.grade].count += l.count;
  }

  return {
    date,
    boulderCount,
    ropeCount,
    totalCount: boulderCount + ropeCount,
    grades: Object.entries(grades).map(([grade, { count, type }]) => ({
      grade,
      count,
      color: getGradeColor(grade, type),
      score: getGradeScore(grade, type),
    })),
  };
}

export function aggregateByDate(
  logs: LogEntry[],
  startDate: string,
  endDate: string,
  type?: LogType
): DailyAggregate[] {
  const filtered = type ? logs.filter((l) => l.type === type) : logs;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const result: DailyAggregate[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(buildDailyAggregate(filtered, toKey(d)));
  }
  return result;
}

export function aggregateByWeek(
  logs: LogEntry[],
  weekCount: number,
  type?: LogType
): WeeklyAggregate[] {
  const filtered = type ? logs.filter((l) => l.type === type) : logs;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: WeeklyAggregate[] = [];

  for (let w = weekCount - 1; w >= 0; w--) {
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff - w * 7);

    const days: DailyAggregate[] = [];
    let totalBoulder = 0;
    let totalRope = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const agg = buildDailyAggregate(filtered, toKey(d));
      days.push(agg);
      totalBoulder += agg.boulderCount;
      totalRope += agg.ropeCount;
    }

    result.push({ weekStart: toKey(weekStart), days, totalBoulder, totalRope });
  }

  return result;
}

export function aggregateByMonth(
  logs: LogEntry[],
  year: number,
  type?: LogType
): MonthlyAggregate[] {
  const filtered = type ? logs.filter((l) => l.type === type) : logs;
  const result: MonthlyAggregate[] = [];

  for (let m = 1; m <= 12; m++) {
    const prefix = `${year}-${pad(m)}`;
    const monthLogs = filtered.filter((l) => l.date.startsWith(prefix));

    let totalBoulder = 0;
    let totalRope = 0;
    const dates = new Set<string>();

    for (const l of monthLogs) {
      if (l.type === "boulder") totalBoulder += l.count;
      else totalRope += l.count;
      dates.add(l.date);
    }

    result.push({
      month: m,
      year,
      totalBoulder,
      totalRope,
      sessionCount: dates.size,
    });
  }

  return result;
}
