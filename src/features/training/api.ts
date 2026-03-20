// src/features/training/api.ts

import { api } from "../../lib/apiClient";

export const trainingApi = {
  /** Favorite an exercise (backend endpoint — placeholder for future) */
  favoriteExercise: (exerciseId: string) =>
    api.post(`/exercises/${exerciseId}/favorite`),

  /** Unfavorite an exercise */
  unfavoriteExercise: (exerciseId: string) =>
    api.del(`/exercises/${exerciseId}/favorite`),

  /** Get all favorited exercises */
  getFavoriteExercises: () =>
    api.get<{ items: any[] }>("/exercises/favorites"),

  /** Log a workout completion for a session exercise */
  logExerciseCompletion: (data: {
    exerciseId: string;
    planId?: string;
    sessionId?: string;
    completion: number;
    intensity: string;
    notes?: string;
  }) => api.post("/training/log", data),

  /** Submit session self-assessment */
  submitSessionAssessment: (data: {
    planId?: string;
    sessionId?: string;
    rpe: number;
    feeling: number;
    durationSeconds: number;
    completedCount: number;
    totalCount: number;
    notes?: string;
  }) => api.post("/training/assessment", data),
};
