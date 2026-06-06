// src/features/exercises/api.ts

import { api } from "@/lib/apiClient";
import type { ExerciseDetail } from "./types";

/** Slim row returned by GET /exercises (BE ExerciseListOut). Detail-only
 *  fields (protocol / protocol_variants / cues / muscles arrays) are
 *  omitted on the list endpoint to keep payloads small. */
export interface ExerciseListItem {
  id: string;
  name_zh: string;
  name_en: string;
  goal: string;
  level: string;
  muscles: string[];
  equipment: string[];
  user_tags: string[];
  duration_min: number | null;
  short_desc_en: string | null;
  is_active: boolean;
}

export interface ListExercisesOptions {
  goal?: string;
  level?: string;
  blockTag?: string;
  activeOnly?: boolean;
}

export const exercisesApi = {
  /** Get full exercise detail by ID */
  getExerciseDetail: (id: string) =>
    api.get<ExerciseDetail>(`/exercises/${encodeURIComponent(id)}`),

  /** GET /exercises — slim list rows with optional server-side filters.
   *  Used by the Template Builder action picker (TR4b). */
  listExercises: (opts: ListExercisesOptions = {}) => {
    const qs = new URLSearchParams();
    if (opts.goal) qs.set("goal", opts.goal);
    if (opts.level) qs.set("level", opts.level);
    if (opts.blockTag) qs.set("block_tag", opts.blockTag);
    if (opts.activeOnly !== undefined)
      qs.set("active_only", String(opts.activeOnly));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<ExerciseListItem[]>(`/exercises${suffix}`);
  },
};
