import type { LogEntry, SessionEntry } from "../../store/useLogsStore";

export type { LogEntry, SessionEntry };

export type LogType = "boulder" | "toprope" | "lead";

export interface GradeCount {
  grade: string;
  count: number;
  color: string;
  score: number;
}

export interface DailyAggregate {
  date: string;
  boulderCount: number;
  ropeCount: number;
  totalCount: number;
  grades: GradeCount[];
}

export interface WeeklyAggregate {
  weekStart: string;
  days: DailyAggregate[];
  totalBoulder: number;
  totalRope: number;
}

export interface MonthlyAggregate {
  month: number;
  year: number;
  totalBoulder: number;
  totalRope: number;
  sessionCount: number;
}

export interface KPISummary {
  totalSends: number;
  totalBoulder: number;
  totalRope: number;
  maxBoulder: string;
  maxRope: string;
  maxFlash: string;
  sessionCount: number;
  activeDays: number;
}

export interface StackedBarItem {
  stacks: { value: number; color: string }[];
  label: string;
  spacing?: number;
  labelTextStyle?: object;
  topLabelComponent?: () => React.ReactElement;
}
