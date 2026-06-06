// src/features/workouts/api.ts — TR2 /workout-templates endpoints.

import { api } from "@/lib/apiClient";

import type {
  WorkoutTemplateIn,
  WorkoutTemplateOut,
  WorkoutTemplateSummary,
  WorkoutTemplateUpdateIn,
} from "./types";

export type ListSource = "official" | "mine";

export const workoutsApi = {
  /** POST /workout-templates — create a custom template. */
  create: (payload: WorkoutTemplateIn) =>
    api.post<WorkoutTemplateOut>("/workout-templates", payload),

  /** GET /workout-templates?source=official|mine — default: mine. */
  list: (source: ListSource = "mine") =>
    api.get<WorkoutTemplateSummary[]>(`/workout-templates?source=${source}`),

  /** GET /workout-templates/{id} — full detail. */
  get: (id: string) =>
    api.get<WorkoutTemplateOut>(
      `/workout-templates/${encodeURIComponent(id)}`,
    ),

  /** PATCH /workout-templates/{id} — owner-only partial update. */
  update: (id: string, payload: WorkoutTemplateUpdateIn) =>
    api.patch<WorkoutTemplateOut>(
      `/workout-templates/${encodeURIComponent(id)}`,
      payload,
    ),

  /** DELETE /workout-templates/{id} — owner-only soft delete (204). */
  remove: (id: string) =>
    api.del<void>(`/workout-templates/${encodeURIComponent(id)}`),
};
