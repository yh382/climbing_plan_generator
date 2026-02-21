// src/feature/planGenerator/types.ts
export type Step = 1 | 2 | 3 | 4;

export type Gender = "男" | "女";
export type RangeOpt = "1-2次" | "2-3次" | "3-4次" | "4-5次" | "5-6次" | "6-7次";
export type RestDays = 1 | 2 | 3 | 4 | 5 | 6;

export type WeaknessKey = "fingerStrength" | "power" | "endurance" | "footwork";

export type VScaleOpt =
  | "v1-v2" | "v2-v3" | "v3-v4" | "v4-v5" | "v5-v6"
  | "v6-v7" | "v7-v8" | "v8-v9" | "v9以上";

export type WeekdayKey = "Sun"|"Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat";

export type FormState = {
  gender: Gender | null;
  height: number | null; // cm
  weight: number | null; // kg
  bodyfat: number | null; // %
  freq_per_week: number;

  grip_kg: number | null;
  plank_sec: number | null;
  sit_and_reach_cm: number | null;
  hip_mobility_score: 0|1|2|3|4|5;

  climb_freq: RangeOpt;
  train_freq: RangeOpt;
  rest_days: RestDays;
  rest_weekdays: WeekdayKey[];

  bw_rep_max: number;
  weighted_pullup_1rm_kg: number;

  one_arm_hang: number;
  weaknesses: WeaknessKey[];

  boulder_level: VScaleOpt;
  yds_level: string;

  hardest_send?: {
    type: 'boulder' | 'rope';
    grade: string;
    style: 'flash' | 'redpoint';
  } | null;

  indoor_outdoor_ratio?: number;

  pain_finger_0_3: 0|1|2|3;
  pain_shoulder_0_3: 0|1|2|3;
  pain_elbow_0_3: 0|1|2|3;
  pain_wrist_0_3: 0|1|2|3;
  stretching_freq_band: '0'|'1-2'|'3-4'|'5-7';

  climb_days_per_week: number;
  gym_days_per_week: number;
  cycle_weeks: number;
};
