import { create } from "zustand";
import { api } from "@/lib/apiClient";

export type PerfDatum = {
  value: any; 
  z?: number;
};

export type Performance = {
  updated_at?: string;
  pullup_max_reps?: PerfDatum;
  deadhang_2h_sec?: PerfDatum;
  pushup_max_reps?: PerfDatum;
  plank_sec?: PerfDatum;
  hang_2h_30mm_sec?: PerfDatum;
  boulder_grade?: PerfDatum;
  lead_grade?: PerfDatum;
};

export type AbilityScores = {
  finger: number;
  pull: number;
  core: number;
  flex: number;
  sta: number;
};

export type Profile = {
  user_id?: string;
  
  anthropometrics?: {
    height_cm?: number;
    weight_kg?: number;
    ape_index?: number;
    level?: string | null;
    sit_and_reach_cm?: number; 
  };

  performance?: Performance;
  ability_scores?: AbilityScores;

  // [关键修复] 显式添加这两个字段，解决组件报错
  strength?: any;
  mobility?: any;

  recovery?: {
    sleep_hours_avg?: number;
    stretching_freq_band?: string;
    pain?: {
      finger?: number;
      shoulder?: number;
      elbow?: number;
      wrist?: number;
    };
  };
  
  preferences?: {
    primary_discipline?: "boulder" | "rope";
    weekly_hours?: number;
    home_gym_id?: string | null;
    primary_outdoor_area?: string | null;
    favorites?: { gym_ids?: string[]; route_ids?: string[] };
  };

  experience?: string;
  injuries?: string[];
  equipment?: string[];
  weekly_pref?: {
    climb_target?: number;
    train_target?: number;
    min_rest?: number;
  };
  time_budget?: {
    per_climb_min?: number;
    per_train_min?: number;
  };
  
  constraints?: any;
  gear?: any;
  updated_at?: string;
};

type State = { profile?: Profile; loading: boolean; saving: boolean; error?: string };
type Actions = {
  fetchMe: () => Promise<void>;
  updateMe: (partial: Partial<Profile>) => Promise<void>;
};

export const useProfileStore = create<State & Actions>((set, get) => ({
  loading: false,
  saving: false,
  async fetchMe() {
    set({ loading: true, error: undefined });
    try {
      const data = await api.get<Profile>("/profiles/me");
      set({ profile: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
  async updateMe(partial) {
    set({ saving: true });
    const prev = get().profile;
    if (prev) set({ profile: { ...prev, ...partial } });
    try {
      const data = await api.put<Profile>("/profiles/me", partial);
      set({ profile: data, saving: false });
    } catch (e) {
      set({ saving: false });
      console.error("Update profile failed", e);
    }
  },
}));