import { gradeToScore, scoreToGrade } from "../../lib/gradeSystem";
import { colorForBoulder, colorForYDS } from "../../../lib/gradeColors";
import type { LogEntry, LogType, GradeCount } from "./types";

// All valid scores for each grade system
const VSCALE_SCORES = Array.from({ length: 18 }, (_, i) => i); // V0(0) - V17(17)
const YDS_SCORES = [
  56, 57, 58, 59, // 5.6 - 5.9
  100, 101, 102, 103, // 5.10a-d
  110, 111, 112, 113, // 5.11a-d
  120, 121, 122, 123, // 5.12a-d
  130, 131, 132, 133, // 5.13a-d
  140, 141, 142, 143, // 5.14a-d
  150, 151, 152, 153, // 5.15a-d
];

// Default max scores for minimum display range
const DEFAULT_MAX: Record<LogType, number> = {
  boulder: 10, // V10
  toprope: 112, // 5.11c
  lead: 112,    // 5.11c
};

/** Check if a log entry matches the requested type. For rope types (toprope/lead), include all non-boulder logs. */
function matchesType(logType: LogType, filterType: LogType): boolean {
  if (filterType === "boulder") return logType === "boulder";
  // For toprope or lead filter, include both toprope and lead logs
  return logType !== "boulder";
}

/**
 * Get grade color — single source of truth.
 * Replaces inline getBoulderColor/getRopeColor in GradePyramid & TrainingVolumeChart.
 */
export function getGradeColor(grade: string, type: LogType): string {
  return type === "boulder" ? colorForBoulder(grade) : colorForYDS(grade);
}

/**
 * Get grade numeric score — single source of truth.
 * Replaces hardcoded GRADE_SCORE in analysis.tsx.
 */
export function getGradeScore(grade: string, type: LogType): number {
  try {
    const system = type === "boulder" ? "vscale" : "yds";
    return gradeToScore(grade, system as any);
  } catch {
    return 0;
  }
}

/**
 * Build grade pyramid data sorted by difficulty (highest first).
 */
export function buildGradePyramid(
  logs: LogEntry[],
  type: LogType
): GradeCount[] {
  const counts: Record<string, number> = {};
  for (const l of logs) {
    if (!matchesType(l.type, type)) continue;
    counts[l.grade] = (counts[l.grade] || 0) + l.count;
  }

  return Object.entries(counts)
    .map(([grade, count]) => ({
      grade,
      count,
      color: getGradeColor(grade, type),
      score: getGradeScore(grade, type),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Get the highest grade from logs.
 */
export function getMaxGrade(logs: LogEntry[], type: LogType): string {
  let maxScore = -1;
  let maxGrade = "—";
  for (const l of logs) {
    if (!matchesType(l.type, type)) continue;
    const score = getGradeScore(l.grade, type);
    if (score > maxScore) {
      maxScore = score;
      maxGrade = l.grade;
    }
  }
  return maxGrade;
}

/**
 * Build grade pyramid with a minimum number of rows.
 * Always starts from the lowest grade (V0 / 5.6).
 * Minimum 11 rows; expands if user logged higher grades.
 */
export function buildFixedGradePyramid(
  logs: LogEntry[],
  type: LogType
): GradeCount[] {
  const allScores = type === "boulder" ? VSCALE_SCORES : YDS_SCORES;
  const system = type === "boulder" ? "vscale" : "yds";
  const defaultMax = DEFAULT_MAX[type];

  // Count sends per grade from logs
  const counts: Record<string, number> = {};
  let loggedMaxScore = -1;
  for (const l of logs) {
    if (!matchesType(l.type, type)) continue;
    counts[l.grade] = (counts[l.grade] || 0) + l.count;
    const s = getGradeScore(l.grade, type);
    if (s > loggedMaxScore) loggedMaxScore = s;
  }

  // Top score = max(default, logged)
  const topScore = Math.max(defaultMax, loggedMaxScore);

  // Filter valid scores from lowest to topScore
  const visibleScores = allScores.filter((s) => s <= topScore);

  return visibleScores.map((s) => {
    const grade = scoreToGrade(s, system as any);
    return {
      grade,
      count: counts[grade] || 0,
      color: getGradeColor(grade, type),
      score: s,
    };
  }).sort((a, b) => b.score - a.score); // highest first
}
