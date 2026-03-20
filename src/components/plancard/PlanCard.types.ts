// src/components/plancard/PlanCard.types.ts

import type { ReactNode } from "react";

/**
 * ---- Core enums (stable) ----
 */

export type PlanSource = "ai" | "custom" | "official";

export type PlanVisibility = "public" | "private";

export type PlanStatus = "active" | "paused" | "completed";

/**
 * TrainingType is used for:
 * - background color / theme
 * - tags
 * - filtering
 *
 * Keep it small and stable. You can extend later without breaking UI.
 */
export type TrainingType =
  | "strength"
  | "endurance"
  | "power"
  | "mobility"
  | "recovery"
  | "technique"
  | "mixed";

/**
 * Grade systems can vary; keep it flexible.
 * Examples:
 * - bouldering: "V4", "V8"
 * - route: "5.11a", "5.12d"
 */
export type GradeLabel = string;

export type GradeRange = {
  min?: GradeLabel;
  max?: GradeLabel;
  /** Optional human readable label, e.g. "Intermediate" */
  label?: string;
};

/**
 * ---- Plan metrics / progress ----
 */

export type PlanMarketMetrics = {
  ratingAvg?: number; // 0-5
  ratingCount?: number;
  followerCount?: number; // how many users follow / saved
  runCount?: number; // how many times started/used
};

export type PlanProgress = {
  /** current week index, 1-based */
  currentWeek?: number;
  /** total weeks */
  totalWeeks?: number;

  /** computed progress 0..1, optional; if missing, UI can derive from weeks */
  progressRatio?: number;

  /** total sessions planned and completed */
  sessionsPlanned?: number;
  sessionsCompleted?: number;

  /** last trained date (ISO), used in owner view */
  lastTrainedAt?: string;
};

/**
 * ---- Plan ownership / author ----
 * - authorName is for display (“by X”)
 * - authorId used for routing to profile if needed
 */
export type PlanAuthor = {
  authorName?: string;
  authorId?: string;
};

/**
 * ---- The Plan model used by plan cards ----
 *
 * Important:
 * - Keep this as a "UI-facing" shape (not necessarily identical to backend).
 * - You can create adapters later from PlanV3 / Plan summaries, etc.
 */
export type TrainingPlan = {
  id: string;

  title: string;

  source: PlanSource;
  visibility: PlanVisibility;
  status: PlanStatus;

  trainingType: TrainingType;

  /**
   * Optional cover:
   * - could be remote URL
   * - could be local asset key
   * Card can decide how to render.
   */
  coverImageUri?: string;

  /**
   * Plan duration & time estimates
   */
  durationWeeks?: number;
  /**
   * Estimated time per session in minutes
   * (for Market cards it helps; for Active cards it's often not needed)
   */
  estSessionMinutes?: number;

  /**
   * Suitable level range (bouldering or route). Flexible string labels.
   */
  levelRange?: GradeRange;

  author?: PlanAuthor;

  /**
   * Optional description/tags
   */
  summary?: string;
  tags?: string[];

  /**
   * Metrics used mainly in Market contexts
   */
  market?: PlanMarketMetrics;

  /**
   * Progress used mainly in Active/Owner contexts
   */
  progress?: PlanProgress;

  /**
   * If your backend supports “fork/remix” later, keep placeholders here:
   */
  forkedFromPlanId?: string;
};

/**
 * ---- Card variants / contexts ----
 *
 * Variant controls information density.
 * Context controls what actions/metadata are allowed.
 */
export type PlanCardVariant = "market" | "active" | "compact" | "history";

export type PlanCardContext = "public" | "personal";

/**
 * Optional display options for plan cards.
 * Keep it additive so adding new options won't break call sites.
 */
export type TrainingPlanCardDisplayOptions = {
  /**
   * Force show/hide certain blocks even within a variant
   * (use sparingly; prefer correct variant selection).
   */
  showAuthor?: boolean;
  showLevelRange?: boolean;
  showDurationWeeks?: boolean;
  showEstSessionMinutes?: boolean;
  showMarketMetrics?: boolean; // rating/runCount/followers
  showProgress?: boolean; // week progress bar etc.
  showVisibilityBadge?: boolean; // 🔒 / Public
  showSourceBadge?: boolean; // 🤖 AI / 🧠 Custom / ⭐ Official

  /**
   * When you want different list density:
   */
  compactPadding?: boolean;
};

/**
 * Actions:
 * - onPress: open plan detail
 * - primaryAction: "Continue" / "Follow" / "Start"
 * - overflowAction: "..." menu
 */
export type PlanCardPrimaryAction =
  | { type: "continue"; label?: string }
  | { type: "start"; label?: string }
  | { type: "follow"; label?: string }
  | { type: "view"; label?: string };

export type TrainingPlanCardHandlers = {
  onPress?: (plan: TrainingPlan) => void;

  /**
   * Primary CTA in card (optional)
   */
  primaryAction?: {
    action: PlanCardPrimaryAction;
    onAction: (plan: TrainingPlan) => void;
  };

  /**
   * Overflow menu (⋯)
   * For owner/manage contexts (My Plans / Plan Detail)
   */
  onOpenMenu?: (plan: TrainingPlan) => void;

  /** Resume minimized workout */
  onResumeWorkout?: () => void;
};

export type TrainingPlanCardProps = {
  plan: TrainingPlan;

  /**
   * Determines card layout and density:
   * - market: discovery / plaza / library / visitor profile
   * - active: calendar / owner profile / home
   * - compact: my plans list
   * - history: plan history list
   */
  variant: PlanCardVariant;

  /**
   * public: shown to other users; avoid owner-only controls
   * personal: owner views; allow menu, visibility indicators, etc.
   */
  context: PlanCardContext;

  /**
   * Optional fine-grained overrides (use sparingly).
   */
  display?: TrainingPlanCardDisplayOptions;

  /**
   * For custom right-side slots if needed in v2.
   */
  rightAccessory?: ReactNode;

  handlers?: TrainingPlanCardHandlers;

  /** Formatted workout timer string (e.g. "05:23") when a workout is active & minimized */
  workoutTimer?: string;

  /**
   * Useful for list rendering or testing
   */
  testID?: string;
};

/**
 * ---- Helpers (optional, but handy) ----
 */

export const isOwnerContext = (context: PlanCardContext) => context === "personal";
export const isPublicContext = (context: PlanCardContext) => context === "public";

/**
 * A tiny helper for badge labels; UI can use this.
 */
export const sourceBadgeText = (source: PlanSource) => {
  switch (source) {
    case "ai":
      return "AI";
    case "custom":
      return "Custom";
    case "official":
      return "Official";
    default:
      return "Plan";
  }
};

// ---- Trending / Intent taxonomy (v1) ----
// 分类原则：按训练意图（intent），不是按单一部位；与规范一致
export type TrainingIntent = "all" | "strength" | "endurance" | "power" | "technique" | "recovery";

export const TRAINING_INTENTS: { key: TrainingIntent; label: string }[] = [
  { key: "all", label: "All" },
  { key: "strength", label: "Strength" },
  { key: "endurance", label: "Endurance" },
  { key: "power", label: "Power" },
  { key: "technique", label: "Technique" },
  { key: "recovery", label: "Recovery" },
];
