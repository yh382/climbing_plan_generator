// src/features/workouts/types.ts
//
// FE mirror of BE schemas/workout_template.py (TR2, flat-items refactor
// TR4c 2026-06-05). Kept hand-written rather than openapi-typescript-
// generated for two reasons:
// 1. Slightly nicer ergonomics than `components["schemas"]["WorkoutTemplateOut"]`.
// 2. Lets us reference these types from the active-workout store without
//    pulling the entire api.ts surface.
//
// TR4c rename — the old two-level `blocks: Block[]` was collapsed into a
// flat `items: WorkoutItem[]` with `phase` carried per item. FE auto-
// sections by `phase` (warmup / main / cooldown) for visual grouping.
// Legacy `accessory` phase was dropped (folded into `main` at migration
// time on BE).
//
// IMPORTANT: when BE WorkoutTemplate*/WorkoutItem schemas change, regen
// api.ts and copy the deltas here. Drift here = silent runtime bugs at
// template execution time.

import type { ProtocolVariant } from "../exercises/types";

export type TemplateSource = "official" | "custom";
export type TemplateVisibility = "private" | "public";
/** Workout-flow phase the exercise sits under. FE groups by `phase` to
 *  render Warmup / Main / Cooldown sections. */
export type Phase = "warmup" | "main" | "cooldown";

export type LoadUnit = "lb" | "kg" | "pct";

export interface WorkoutItem {
  /** Phase the exercise belongs to. Defaults to "main" if a producer
   *  omits it (matches BE default). */
  phase: Phase;
  /** FK to Exercise.id (e.g. "sp-board-10") */
  action_id: string;
  /** Selected variant from Exercise.protocol_variants (e.g. "v60").
   *  Null = use base protocol. */
  variant_id?: string | null;
  sets?: number | null;
  reps?: number | null;
  seconds?: number | null;
  /** Rest between sets (long rest). */
  rest_sec?: number | null;
  /** Micro-rest between reps within a set (hangboard intervals
   *  "7s on, 3s off"). Distinct from rest_sec. */
  rest_per_rep_sec?: number | null;
  /** Load value; meaning depends on load_unit. */
  load?: number | null;
  load_unit?: LoadUnit | null;
  notes?: string | null;
}

/** GET /workout-templates/{id} response body. */
export interface WorkoutTemplateOut {
  id: string;
  owner_id: string;
  title: string;
  source: TemplateSource;
  visibility: TemplateVisibility;
  goal_tags: string[];
  equipment: string[];
  items: WorkoutItem[];
  est_duration_min: number | null;
  short_desc_zh: string | null;
  short_desc_en: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** GET /workout-templates list row. */
export interface WorkoutTemplateSummary {
  id: string;
  title: string;
  source: TemplateSource;
  goal_tags: string[];
  equipment: string[];
  est_duration_min: number | null;
  short_desc_zh: string | null;
  short_desc_en: string | null;
  cover_image_url: string | null;
  author_name: string | null;
}

/** POST /workout-templates body. */
export interface WorkoutTemplateIn {
  title: string;
  goal_tags?: string[];
  equipment?: string[];
  items?: WorkoutItem[];
  short_desc_zh?: string | null;
  short_desc_en?: string | null;
  cover_image_url?: string | null;
  visibility?: TemplateVisibility;
}

/** PATCH /workout-templates/{id} body — every field optional. */
export type WorkoutTemplateUpdateIn = Partial<WorkoutTemplateIn> & {
  is_active?: boolean;
};

// Re-export ProtocolVariant so callers wiring template+exercise data
// don't have to dual-import. Single source of truth stays in exercises/.
export type { ProtocolVariant };
