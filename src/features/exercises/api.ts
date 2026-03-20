// src/features/exercises/api.ts

import { api } from "@/lib/apiClient";
import type { ExerciseDetail } from "./types";

export const exercisesApi = {
  /** Get full exercise detail by ID */
  getExerciseDetail: (id: string) =>
    api.get<ExerciseDetail>(`/exercises/${encodeURIComponent(id)}`),
};
