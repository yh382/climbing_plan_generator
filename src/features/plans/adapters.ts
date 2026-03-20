// src/features/plans/adapters.ts
import type { PlanSummaryOut, PlanDetailOut } from "./types";
import type { TrainingPlan, TrainingType } from "../../components/plancard/PlanCard.types";
import { planV3ToTrainingPlan } from "../../components/plancard/adapters/planV3ToTrainingPlan";

/**
 * List adapter — no planJson, infer UI fields from metadata.
 */
export function planSummaryToTrainingPlan(summary: PlanSummaryOut): TrainingPlan {
  return {
    id: summary.id,
    title: summary.title,
    source: summary.source,
    visibility: summary.visibility,
    status: summary.status,
    trainingType: (summary.trainingType as TrainingType) || "mixed",
    durationWeeks: summary.durationWeeks ?? undefined,
    coverImageUri: summary.coverImageUrl ?? undefined,
    author: summary.authorName ? { authorName: summary.authorName } : undefined,
  };
}

/**
 * Detail adapter — has planJson, use existing planV3ToTrainingPlan for rich conversion.
 */
export function planDetailToTrainingPlan(detail: PlanDetailOut): TrainingPlan {
  const base = planV3ToTrainingPlan(detail.planJson, {
    source: detail.source,
    visibility: detail.visibility,
    status: detail.status,
    createdAt: detail.createdAt,
  });
  return {
    ...base,
    id: detail.id,
    title: detail.title,
    coverImageUri: (detail as PlanSummaryOut).coverImageUrl ?? undefined,
  };
}
