// src/features/profile/mappers/mapUserProfileToHeaderVM.ts

type PerfDatum = { value: number | null; z?: number | null } | null;

export type AbilityScoresDTO = {
  finger: number;
  pull: number;
  core: number;
  flex: number;
  sta: number;
};

export type UserProfileDTO = {
  anthropometrics?: {
    height?: number | null;
    weight?: number | null;
    arm_span?: number | null;
    ape_index?: number | null;
    sit_and_reach_cm?: number | null;
  } | null;

  // ✅ new backend-aligned blocks (same names as frontend)
  capacity?: {
    max_pullups?: number | null;
    weighted_pullup_kg?: number | null;
  } | null;

  finger_strength?: {
    protocol?: "maxhang" | "repeater" | null;
    edge_mm?: number | null;
    grip?: "half_crimp" | "open_hand" | "full_crimp" | null;
    fingers?: number | null;
    hang_seconds?: number | null;
    added_weight_kg?: number | null;

    index?: number | null; // computed by backend
    updated_at?: string | null;
    version?: number | null;
  } | null;

  performance?: {
    pullup_max_reps?: PerfDatum;

    // legacy hang fields (if you still have them)
    deadhang_2h_sec?: PerfDatum;
    hang_2h_30mm_sec?: PerfDatum;
  } | null;

  ability_scores?: AbilityScoresDTO | null;
};

export type HeaderViewModel = {
  bodyMetrics: {
    height: number | null;
    weight: number | null;
    apeIndex: number | null;
  };
  strengthStats: {
    maxPullUps: number | null;
    weightedPullUp: number | null; // +kg
    hangTime: number | null; // sec
  };
  abilityRadar?: AbilityScoresDTO;
};

export function mapUserProfileToHeaderVM(profile: UserProfileDTO | null | undefined): HeaderViewModel {
  const a = profile?.anthropometrics ?? null;
  const cap = profile?.capacity ?? null;
  const fs = profile?.finger_strength ?? null;
  const p = profile?.performance ?? null;

  // Prefer new structured fields; fallback to legacy performance
  const maxPullUps =
    cap?.max_pullups ?? p?.pullup_max_reps?.value ?? null;

  const weightedPullUp =
    cap?.weighted_pullup_kg ?? null;

  // Hang time: prefer finger_strength hang_seconds (more consistent with your BasicInfo input),
  // else fallback to legacy performance deadhang/hang fields.
  const hangTime =
    fs?.hang_seconds ??
    p?.hang_2h_30mm_sec?.value ??
    p?.deadhang_2h_sec?.value ??
    null;

  return {
    bodyMetrics: {
      height: a?.height ?? null,
      weight: a?.weight ?? null,
      apeIndex: a?.ape_index ?? null,
    },
    strengthStats: {
      maxPullUps,
      weightedPullUp,
      hangTime,
    },
    abilityRadar: profile?.ability_scores ?? undefined,
  };
}

