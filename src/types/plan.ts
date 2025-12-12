// src/types/plan.ts

export type PlanV3SessionItem = {
  action_id: string;
  sets?: number;
  reps?: number;
  seconds?: number;
  rest_sec?: number;
  rpe_target?: number;
  notes?: { zh: string; en: string };
  name_override?: { zh: string; en: string };
  media?: { video?: string; image?: string }; 
  cues?: { zh: string; en: string };
};

export type PlanV3Block = {
  block_type: string;
  items: PlanV3SessionItem[];
};

export type PlanV3Session = {
  id: string;
  type: "climb" | "train";
  intensity?: string;
  est_duration_min?: number; // 后端其实有这个字段
  blocks: PlanV3Block[];
};

export type PlanV3 = {
  meta: any;
  quotas: { climb: number; train: number; rest_suggested: number };
  session_bank: {
    climb_sessions: PlanV3Session[];
    train_sessions: PlanV3Session[];
  };
};