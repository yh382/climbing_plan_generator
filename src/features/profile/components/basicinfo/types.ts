export type AbilityRadarVM = {
  finger: number; // 0-100
  pull: number;
  core: number;
  flex: number;
  sta: number;
};

export type HeaderViewModel = {
  bodyMetrics: {
    height: number | null;
    weight: number | null;
    apeIndex: number | null;
  };
  strengthStats: {
    maxPullUps: number | null;
    weightedPullUp: number | null;
    hangTime: number | null;
  };
  abilityRadar?: AbilityRadarVM;
};

export type Anthropometrics = {
  height: number | null; // cm
  weight: number | null; // kg
  arm_span: number | null; // cm
  ape_index?: number | null; // cm

  // ✅ NEW
  mobility_band?: number | null; // 1-5 subjective band
};

export type Capacity = {
  max_pullups: number | null; // reps
  weighted_pullup_kg: number | null; // +kg (can be 0)
};

export type FingerStrength = {
  edge_mm: 10 | 15 | 20 | null;
  grip: "half_crimp" | "open_hand" | null;
  added_weight_kg: number | null; // can be negative (assisted)
  hang_seconds: number | null; // usually 7-10

  // legacy fields
  added_kg?: number | null;
  hang_s?: number | null;
  assessed_at?: string | null;
};

export type ClimbingBackground = {
  discipline: "boulder" | "sport" | "both" | null;
  preferred_angle: "slab" | "vertical" | "overhang" | "mixed" | null;
  experience_years: number | null;
  injury_flags?: {
    finger?: boolean;
    shoulder?: boolean;
    elbow?: boolean;
  } | null;
};
