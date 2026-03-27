/**
 * Climb State Model — frontend mirror of backend csm_engine.py.
 * Used for offline / local computation when full ClimbLog data is available.
 */

import type { ClimbLog } from '../../types/climbLog';

// ---- Types ----

export interface EdgeGradeStat {
  gradeScore: number;
  gradeText: string;
  logCount: number;       // number of log entries at this grade
  sends: number;
  totalTries: number;     // sum of log.attempts across all logs
  avgTries: number;       // average log.attempts for sends
  sendRate: number;
}

export interface EdgeZone {
  lower: number;
  upper: number;
  width: number;
  sampleCount: number;
  sufficient: boolean;
  sendRate: number;
  grades: EdgeGradeStat[];
  qsr: number;            // Quick Send Rate (attempts <= 2)
  pr: number;             // Project Rate (attempts >= 5)
}

export type Quadrant = 'push' | 'challenge' | 'develop' | 'rebuild';

export interface CSMState {
  discipline: 'boulder' | 'rope';
  pi: number;
  el: number;
  ce: number;
  edgeZone: EdgeZone;
  lp: number;
  ss: number;
  quadrant: Quadrant;
  logCount: number;
  windowStart: string;
  windowEnd: string;
}

export interface CSMHistoryPoint {
  weekLabel: string;
  lp: number;
  ss: number;
  quadrant: Quadrant;
  logCount: number;
}

// ---- Constants ----

const WINDOW_WEEKS = 6;
const RECENCY_DECAY = 0.05;
const PI_TOP_N = 5;
const LP_NORMALIZE = 0.6;
const MIN_EDGE_SAMPLES = 3;
const SEND_RESULTS = new Set(['send', 'flash', 'onsight']);

const EDGE_CONFIG = {
  boulder: { ratio: 0.25, minWidth: 2 },
  rope: { ratio: 0.04, minWidth: 4 },
} as const;

// ---- Helpers ----

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function toDate(s: string): Date {
  // YYYY-MM-DD → local Date (avoid timezone offset)
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function addWeeks(d: Date, w: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + w * 7);
  return r;
}

// ---- Internal compute functions ----

function computePI(logs: ClimbLog[], today: Date): number {
  const sends = logs.filter(
    (l) => SEND_RESULTS.has(l.result) && l.gradeScore > 0,
  );
  if (!sends.length) return 0;

  sends.sort((a, b) => b.gradeScore - a.gradeScore);
  const top = sends.slice(0, PI_TOP_N);

  let totalWeight = 0;
  let weightedSum = 0;
  for (const l of top) {
    const daysAgo = daysBetween(today, toDate(l.date));
    const w = Math.exp(-RECENCY_DECAY * daysAgo);
    weightedSum += l.gradeScore * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

function computeEL(logs: ClimbLog[], pi: number): number {
  const scores = logs
    .map((l) => l.gradeScore)
    .filter((s) => s > 0);
  if (!scores.length || pi <= 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length / pi;
}

function computeCE(
  logs: ClimbLog[],
  pi: number,
  edgeWidth: number,
  today: Date,
): { ce: number; grades: EdgeGradeStat[] } {
  const lower = pi - edgeWidth;
  const edgeLogs = logs.filter(
    (l) => l.gradeScore > 0 && l.gradeScore >= lower && l.gradeScore <= pi + 0.5,
  );
  if (!edgeLogs.length) return { ce: 0, grades: [] };

  // Per-grade aggregation
  const gradeAgg = new Map<number, {
    gradeScore: number; gradeText: string;
    logCount: number; sends: number;
    totalTries: number; sendTriesList: number[];
  }>();

  for (const l of edgeLogs) {
    const gs = l.gradeScore;
    if (!gradeAgg.has(gs)) {
      gradeAgg.set(gs, {
        gradeScore: gs, gradeText: l.gradeText || String(gs),
        logCount: 0, sends: 0, totalTries: 0, sendTriesList: [],
      });
    }
    const stat = gradeAgg.get(gs)!;
    const att = l.attempts || 1;
    stat.logCount += 1;
    stat.totalTries += att;
    if (SEND_RESULTS.has(l.result)) {
      stat.sends += 1;
      stat.sendTriesList.push(att);
    }
  }

  // CE: weighted sum of 1/sqrt(attempts) for send logs
  let numerator = 0;
  let denominator = 0;
  for (const l of edgeLogs) {
    if (!SEND_RESULTS.has(l.result)) continue;
    const daysAgo = daysBetween(today, toDate(l.date));
    const w = Math.exp(-RECENCY_DECAY * daysAgo);
    const att = l.attempts || 1;
    numerator += w * (1.0 / Math.sqrt(att));
    denominator += w;
  }
  const ce = denominator > 0 ? numerator / denominator : 0;

  // Build grade stats
  const grades: EdgeGradeStat[] = [];
  for (const data of gradeAgg.values()) {
    const triesList = data.sendTriesList;
    const avg = triesList.length > 0
      ? triesList.reduce((a, b) => a + b, 0) / triesList.length
      : 0;
    grades.push({
      gradeScore: data.gradeScore,
      gradeText: data.gradeText,
      logCount: data.logCount,
      sends: data.sends,
      totalTries: data.totalTries,
      avgTries: Math.round(avg * 10) / 10,
      sendRate: data.totalTries > 0 ? data.sends / data.totalTries : 0,
    });
  }
  grades.sort((a, b) => b.gradeScore - a.gradeScore);

  return { ce, grades };
}

function computeLP(logs: ClimbLog[], pi: number, edgeWidth: number): number {
  const lower = pi - edgeWidth;
  const total = logs.filter((l) => l.gradeScore > 0).length;
  if (total === 0) return 0;
  const edgeAndAbove = logs.filter((l) => l.gradeScore >= lower).length;
  const raw = edgeAndAbove / total;
  return Math.min(raw / LP_NORMALIZE, 1.0);
}

function computeSS(
  ce: number,
  logs: ClimbLog[],
  pi: number,
  edgeWidth: number,
): number {
  const lower = pi - edgeWidth;
  const edgeLogs = logs.filter(
    (l) => l.gradeScore > 0 && l.gradeScore >= lower && l.gradeScore <= pi + 0.5,
  );
  const withFeel = edgeLogs.filter((l) => l.feel);
  if (!withFeel.length) return Math.min(Math.max(ce, 0), 1);

  const softCount = withFeel.filter((l) => l.feel === 'soft').length;
  const hardCount = withFeel.filter((l) => l.feel === 'hard').length;
  const totalFeel = withFeel.length;

  const softRatio = softCount / totalFeel;
  const hardRatio = hardCount / totalFeel;
  let feelFactor = 1.0 + softRatio * 0.1 - hardRatio * 0.15;
  feelFactor = Math.max(0.7, Math.min(feelFactor, 1.1));

  return Math.min(Math.max(ce * feelFactor, 0), 1);
}

function determineQuadrant(lp: number, ss: number): Quadrant {
  if (lp >= 0.5 && ss >= 0.5) return 'push';
  if (lp >= 0.5 && ss < 0.5) return 'challenge';
  if (lp < 0.5 && ss >= 0.5) return 'develop';
  return 'rebuild';
}

// ---- Public API ----

export function computeCSM(
  logs: ClimbLog[],
  discipline: 'boulder' | 'rope',
  today?: Date,
): CSMState | null {
  const now = today ?? new Date();
  const windowStart = addWeeks(now, -WINDOW_WEEKS);

  const filtered = logs.filter((l) => {
    const logDate = toDate(l.date);
    if (logDate < windowStart) return false;
    if (discipline === 'boulder') return l.wallType === 'boulder';
    return l.wallType === 'toprope' || l.wallType === 'lead' || l.wallType === 'trad';
  });

  if (filtered.length < 3) return null;

  const config = EDGE_CONFIG[discipline];
  const pi = computePI(filtered, now);
  if (pi <= 0) return null;

  const el = computeEL(filtered, pi);
  const edgeWidth = Math.max(config.minWidth, Math.round(pi * config.ratio));
  const { ce, grades } = computeCE(filtered, pi, edgeWidth, now);

  const edgeSample = grades.reduce((s, g) => s + g.logCount, 0);

  // QSR / PR from edge zone send logs
  const lower = pi - edgeWidth;
  const edgeSendLogs = filtered.filter(
    (l) => l.gradeScore > 0 && l.gradeScore >= lower
      && l.gradeScore <= pi + 0.5 && SEND_RESULTS.has(l.result),
  );
  const totalEdgeSends = edgeSendLogs.length;
  const qsr = totalEdgeSends > 0
    ? edgeSendLogs.filter((l) => (l.attempts || 1) <= 2).length / totalEdgeSends
    : 0;
  const pr = totalEdgeSends > 0
    ? edgeSendLogs.filter((l) => (l.attempts || 1) >= 5).length / totalEdgeSends
    : 0;

  const edgeZone: EdgeZone = {
    lower: pi - edgeWidth,
    upper: pi,
    width: edgeWidth,
    sampleCount: edgeSample,
    sufficient: edgeSample >= MIN_EDGE_SAMPLES,
    sendRate: ce,
    grades,
    qsr: Math.round(qsr * 1000) / 1000,
    pr: Math.round(pr * 1000) / 1000,
  };

  const lp = computeLP(filtered, pi, edgeWidth);
  const ss = computeSS(ce, filtered, pi, edgeWidth);
  const quadrant = determineQuadrant(lp, ss);

  return {
    discipline,
    pi: Math.round(pi * 100) / 100,
    el: Math.round(el * 1000) / 1000,
    ce: Math.round(ce * 1000) / 1000,
    edgeZone,
    lp: Math.round(lp * 1000) / 1000,
    ss: Math.round(ss * 1000) / 1000,
    quadrant,
    logCount: filtered.length,
    windowStart: isoDate(windowStart),
    windowEnd: isoDate(now),
  };
}

export function computeCSMHistory(
  logs: ClimbLog[],
  discipline: 'boulder' | 'rope',
  weeks = 12,
  today?: Date,
): CSMHistoryPoint[] {
  const now = today ?? new Date();
  const points: CSMHistoryPoint[] = [];

  for (let i = weeks; i >= 1; i--) {
    const weekEnd = addWeeks(now, -(i - 1));
    const state = computeCSM(logs, discipline, weekEnd);
    if (state && state.edgeZone.sufficient) {
      points.push({
        weekLabel: isoDate(weekEnd),
        lp: state.lp,
        ss: state.ss,
        quadrant: state.quadrant,
        logCount: state.logCount,
      });
    }
  }

  return points;
}
