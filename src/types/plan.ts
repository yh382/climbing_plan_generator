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
  // [新增] 加上这个字段，解决报错
  session_id: string; 
  type: "climb" | "train";
  intensity?: string;
  est_duration_min?: number; 
  blocks: PlanV3Block[];
  
  // [可选] 为了防止 mock 数据里写了 name/day_index 报错，可以把它们设为可选
  // 如果后端确定不返回这两个字段，就不要加，但为了前端 mock 方便，建议加上
  name?: string;
  day_index?: number;
};

export type PlanV3 = {
  meta: any;
  quotas: { climb: number; train: number; rest_suggested: number };
  session_bank: {
    climb_sessions: PlanV3Session[];
    train_sessions: PlanV3Session[];
  };
};