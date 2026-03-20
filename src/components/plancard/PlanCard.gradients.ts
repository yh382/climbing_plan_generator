// src/components/plancard/PlanCard.gradients.ts

import type { TrainingType } from "./PlanCard.types";

/**
 * Gradient color pairs for each training type.
 * Used as fallback when no cover image is set.
 */
export const TRAINING_TYPE_GRADIENTS: Record<TrainingType, [string, string]> = {
  strength: ["#1E3A5F", "#0F172A"],
  endurance: ["#065F46", "#022C22"],
  power: ["#7C2D12", "#431407"],
  technique: ["#4338CA", "#312E81"],
  mobility: ["#4338CA", "#1E1B4B"],
  recovery: ["#1F2937", "#111827"],
  mixed: ["#1F2937", "#0F172A"],
};
