import { api } from "../../lib/apiClient";
import type { KPISummary, GradeCount, StackedBarItem, LogType } from "./types";
import { getGradeColor } from "./gradeAnalyzer";
import type { CSMState, CSMHistoryPoint } from "./csmAnalyzer";

/**
 * Fetch stats from backend API.
 * Used when user enables "Cloud Stats" in settings.
 */

export async function fetchStatsSummary(): Promise<KPISummary> {
  const res = await api.get<any>("/stats/summary");
  return {
    totalSends: res.total_sends,
    totalBoulder: res.total_boulder,
    totalRope: res.total_rope,
    maxBoulder: res.max_boulder || "—",
    maxRope: res.max_rope || "—",
    maxFlash: "—",
    sessionCount: res.session_count,
    activeDays: res.active_days,
  };
}

export async function fetchGradePyramid(
  wallType: "boulder" | "toprope" | "lead"
): Promise<GradeCount[]> {
  const res = await api.get<any>(`/stats/grade-pyramid?wall_type=${wallType}`);
  const logType: LogType = wallType;
  return (res.items || []).map((item: any) => ({
    grade: item.grade,
    count: item.count,
    score: item.score,
    color: getGradeColor(item.grade, logType),
  }));
}

export async function fetchVolume(
  timeRange: "W" | "M" | "Y"
): Promise<StackedBarItem[]> {
  const res = await api.get<any>(`/stats/volume?time_range=${timeRange}`);
  return (res.items || []).map((item: any) => ({
    label: item.label,
    stacks: [
      { value: item.boulder, color: "#3B82F6" },
      { value: item.rope, color: "#F59E0B" },
    ],
  }));
}

// ---- CSM (Climb State Model) ----

export interface CSMFullResponse {
  boulder: CSMState | null;
  rope: CSMState | null;
  historyBoulder: CSMHistoryPoint[];
  historyRope: CSMHistoryPoint[];
}

function transformEdgeZone(ez: any) {
  return {
    lower: ez.lower,
    upper: ez.upper,
    width: ez.width,
    sampleCount: ez.sample_count,
    sufficient: ez.sufficient,
    sendRate: ez.send_rate,
    grades: (ez.grades || []).map((g: any) => ({
      gradeScore: g.grade_score,
      gradeText: g.grade_text,
      attempts: g.attempts,
      sends: g.sends,
      sendRate: g.send_rate,
    })),
  };
}

function transformCSMState(raw: any): CSMState | null {
  if (!raw) return null;
  return {
    discipline: raw.discipline,
    pi: raw.pi,
    el: raw.el,
    ce: raw.ce,
    edgeZone: transformEdgeZone(raw.edge_zone),
    lp: raw.lp,
    ss: raw.ss,
    quadrant: raw.quadrant,
    logCount: raw.log_count,
    windowStart: raw.window_start,
    windowEnd: raw.window_end,
  };
}

export async function fetchCSMState(): Promise<CSMFullResponse> {
  const res = await api.get<any>("/csm/state");
  return {
    boulder: transformCSMState(res.boulder),
    rope: transformCSMState(res.rope),
    historyBoulder: (res.history_boulder || []).map((p: any) => ({
      weekLabel: p.week_label,
      lp: p.lp,
      ss: p.ss,
      quadrant: p.quadrant,
      logCount: p.log_count,
    })),
    historyRope: (res.history_rope || []).map((p: any) => ({
      weekLabel: p.week_label,
      lp: p.lp,
      ss: p.ss,
      quadrant: p.quadrant,
      logCount: p.log_count,
    })),
  };
}
