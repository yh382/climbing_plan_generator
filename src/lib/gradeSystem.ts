/**
 * Unified grade conversion logic — mirrors backend services/grade_system.py.
 * This is the SINGLE source of truth for grade handling on the frontend.
 */

import type { GradeSystem } from '../types/climbLog';

// ── V-Scale: V0=0, V1=1, ..., V17=17 ────────────────────────────

const V_PATTERN = /^[Vv](\d{1,2})$/;

function vscaleToScore(text: string): number {
  const m = text.trim().match(V_PATTERN);
  if (!m) throw new Error(`Invalid V-scale grade: ${text}`);
  return parseInt(m[1], 10);
}

function scoreToVscale(score: number): string {
  return `V${score}`;
}

// ── YDS: 5.6=56, 5.9=59, 5.10a=100, 5.10b=101, ... ─────────────

const YDS_PATTERN = /^5\.(\d{1,2})([abcd])?([+-])?$/i;
const YDS_SUFFIX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };

function ydsToScore(text: string): number {
  const m = text.trim().match(YDS_PATTERN);
  if (!m) throw new Error(`Invalid YDS grade: ${text}`);
  const major = parseInt(m[1], 10);
  const suffix = (m[2] || '').toLowerCase();
  if (major < 10) return major + 50; // 5.6→56, 5.9→59
  return major * 10 + (YDS_SUFFIX[suffix] ?? 0); // 5.10a→100
}

function scoreToYds(score: number): string {
  if (score < 100) return `5.${score - 50}`;
  const major = Math.floor(score / 10);
  const sub = score % 10;
  const suffix = ['a', 'b', 'c', 'd'][sub] || 'a';
  return `5.${major}${suffix}`;
}

// ── Font (bouldering): 4=40, 4+=41, 5=42, ..., 9C=66 ────────────

const FONT_ORDER = [
  '4', '4+', '5', '5+',
  '6A', '6A+', '6B', '6B+', '6C', '6C+',
  '7A', '7A+', '7B', '7B+', '7C', '7C+',
  '8A', '8A+', '8B', '8B+', '8C', '8C+',
  '9A', '9A+', '9B', '9B+', '9C',
];

const FONT_TO_SCORE = new Map(FONT_ORDER.map((g, i) => [g.toUpperCase(), i + 40]));
const SCORE_TO_FONT = new Map(FONT_ORDER.map((g, i) => [i + 40, g]));

function fontToScore(text: string): number {
  const score = FONT_TO_SCORE.get(text.trim().toUpperCase());
  if (score === undefined) throw new Error(`Invalid Font grade: ${text}`);
  return score;
}

function scoreToFont(score: number): string {
  return SCORE_TO_FONT.get(score) ?? `?${score}`;
}

// ── French (sport): 4a=40, 4b=41, ..., 9c=68 ────────────────────

const FRENCH_ORDER = [
  '4a', '4b', '4c', '5a', '5b', '5c',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b', '9b+', '9c',
];

const FRENCH_TO_SCORE = new Map(FRENCH_ORDER.map((g, i) => [g.toLowerCase(), i + 40]));
const SCORE_TO_FRENCH = new Map(FRENCH_ORDER.map((g, i) => [i + 40, g]));

function frenchToScore(text: string): number {
  const score = FRENCH_TO_SCORE.get(text.trim().toLowerCase());
  if (score === undefined) throw new Error(`Invalid French grade: ${text}`);
  return score;
}

function scoreToFrench(score: number): string {
  return SCORE_TO_FRENCH.get(score) ?? `?${score}`;
}

// ── Public API ───────────────────────────────────────────────────

const CONVERTERS: Record<GradeSystem, (text: string) => number> = {
  vscale: vscaleToScore,
  yds: ydsToScore,
  font: fontToScore,
  french: frenchToScore,
};

const REVERSE: Record<GradeSystem, (score: number) => string> = {
  vscale: scoreToVscale,
  yds: scoreToYds,
  font: scoreToFont,
  french: scoreToFrench,
};

export function gradeToScore(text: string, system: GradeSystem): number {
  return CONVERTERS[system](text);
}

export function scoreToGrade(score: number, system: GradeSystem): string {
  return REVERSE[system](score);
}

export function formatGrade(text: string, system: GradeSystem): string {
  // Normalize display: convert to score then back to canonical form
  try {
    const score = gradeToScore(text, system);
    return scoreToGrade(score, system);
  } catch {
    return text; // Return as-is if invalid
  }
}

export function compareGrades(
  a: { text: string; system: GradeSystem },
  b: { text: string; system: GradeSystem },
): number {
  return gradeToScore(a.text, a.system) - gradeToScore(b.text, b.system);
}
