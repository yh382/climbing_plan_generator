import { create } from "zustand";
import { api } from "@/lib/apiClient";

export type Profile = {
  anthropometrics?: {
    height_cm?: number;
    weight_kg?: number;
    ape_index?: number;
    level?: string | null;
  };
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
    if (prev) set({ profile: { ...prev, ...partial } }); // 乐观
    try {
      const data = await api.put<Profile>("/profiles/me", partial);
      set({ profile: data, saving: false });
    } catch (e) {
      set({ saving: false });
      throw e;
    }
  },
}));
