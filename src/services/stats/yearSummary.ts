import type { LogEntry, SessionEntry, KPISummary } from "./types";
import { getMaxGrade } from "./gradeAnalyzer";

/**
 * Calculate overall KPI summary from logs and sessions.
 * Used by: Analysis page KPI cards + Profile Stats card.
 */
export function calculateKPIs(
  logs: LogEntry[],
  sessions: SessionEntry[]
): KPISummary {
  let totalBoulder = 0;
  let totalRope = 0;

  for (const l of logs) {
    if (l.type === "boulder") totalBoulder += l.count;
    else totalRope += l.count;
  }

  return {
    totalSends: totalBoulder + totalRope,
    totalBoulder,
    totalRope,
    maxBoulder: getMaxGrade(logs, "boulder"),
    maxRope: getMaxGrade(logs, "lead"),
    maxFlash: "—",
    sessionCount: sessions.length,
    activeDays: new Set(logs.map((l) => l.date)).size,
  };
}

/**
 * Calculate KPI for a specific month.
 * Used by: Profile Stats tab monthly overview.
 */
export function calculateMonthlyKPIs(
  logs: LogEntry[],
  sessions: SessionEntry[],
  year: number,
  month: number
): KPISummary {
  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix = `${year}-${pad(month)}`;

  const monthLogs = logs.filter((l) => l.date.startsWith(prefix));
  const monthSessions = sessions.filter((s) => s.date.startsWith(prefix));

  return calculateKPIs(monthLogs, monthSessions);
}
