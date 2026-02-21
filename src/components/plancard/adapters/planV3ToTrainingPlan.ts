// src/components/plancard/adapters/planV3ToTrainingPlan.ts

import type { PlanV3 } from "../../../types/plan";
import type {
  TrainingPlan,
  TrainingType,
  PlanSource,
  PlanVisibility,
  PlanStatus,
} from "../PlanCard.types";

/**
 * Best-effort mapping from your PlanV3 shape to UI-facing TrainingPlan.
 * This adapter intentionally uses lots of fallbacks so it won't break
 * when backend schema evolves.
 */

type Options = {
  status?: PlanStatus;
  visibility?: PlanVisibility;
  source?: PlanSource;
  trainingType?: TrainingType;
};

const inferTitle = (p: PlanV3): string => {
  // Try common fields safely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (p as any)?.meta ?? {};
  return (
    meta?.title ||
    meta?.name ||
    meta?.plan_name ||
    meta?.cycle_name ||
    "Current Plan"
  );
};

const inferAuthorName = (p: PlanV3, source: PlanSource): string | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (p as any)?.meta ?? {};
  return meta?.author || meta?.author_name || (source === "ai" ? "ClimMate AI" : undefined);
};

const inferTrainingType = (p: PlanV3): TrainingType => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (p as any)?.meta ?? {};
  const raw = (meta?.training_type || meta?.focus || meta?.theme || meta?.goal || "").toString().toLowerCase();

  if (raw.includes("strength")) return "strength";
  if (raw.includes("endurance")) return "endurance";
  if (raw.includes("power")) return "power";
  if (raw.includes("mobility")) return "mobility";
  if (raw.includes("recovery")) return "recovery";
  if (raw.includes("technique")) return "technique";

  return "mixed";
};

const inferWeeks = (p: PlanV3): number | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (p as any)?.meta ?? {};
  const w = meta?.cycle_weeks ?? meta?.weeks ?? meta?.duration_weeks;
  return typeof w === "number" ? w : undefined;
};

const inferCurrentWeek = (p: PlanV3): number | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (p as any)?.meta ?? {};
  const cw = meta?.current_week ?? meta?.week ?? meta?.week_index;
  return typeof cw === "number" ? cw : undefined;
};

const inferRemainingSessions = (p: PlanV3): number | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bank: any = (p as any)?.session_bank ?? {};
  const climb = Array.isArray(bank?.climb_sessions) ? bank.climb_sessions.length : 0;
  const train = Array.isArray(bank?.train_sessions) ? bank.train_sessions.length : 0;
  const total = climb + train;
  return total > 0 ? total : undefined;
};

export function planV3ToTrainingPlan(planV3: PlanV3, opts?: Options): TrainingPlan {
  const source: PlanSource = opts?.source ?? "ai";
  const visibility: PlanVisibility = opts?.visibility ?? "private";
  const status: PlanStatus = opts?.status ?? "active";

  const title = inferTitle(planV3);
  const durationWeeks = inferWeeks(planV3);
  const currentWeek = inferCurrentWeek(planV3) ?? 1;
  const totalWeeks = durationWeeks;

  const progressRatio =
    typeof totalWeeks === "number" && totalWeeks > 0
      ? Math.max(0, Math.min(1, currentWeek / totalWeeks))
      : undefined;

  const remainingSessions = inferRemainingSessions(planV3);

  const trainingType: TrainingType = opts?.trainingType ?? inferTrainingType(planV3);

  // Stable id fallback: if PlanV3 has meta.id use it; else a deterministic string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = (planV3 as any)?.meta ?? {};
  const id: string = meta?.id?.toString?.() || meta?.plan_id?.toString?.() || `planv3:${title}`;

  return {
    id,
    title,
    source,
    visibility,
    status,
    trainingType,

    durationWeeks,

    author: {
      authorName: inferAuthorName(planV3, source),
      authorId: meta?.author_id?.toString?.(),
    },

    progress: {
      currentWeek,
      totalWeeks,
      progressRatio,
      // Not perfect, but useful for "Active" context UI
      sessionsPlanned: remainingSessions,
      sessionsCompleted: meta?.sessions_completed,
      lastTrainedAt: meta?.last_trained_at,
    },
    market: {
      ratingAvg: meta?.rating_avg,
      ratingCount: meta?.rating_count,
      followerCount: meta?.follower_count,
      runCount: meta?.run_count,
    },

  };
}
