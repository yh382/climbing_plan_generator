import { create } from "zustand";
import {
  getMyProfile,
  updateMyProfile,
  upsertMyPerformance,
  getProfileByUserId,
  getFollowCounts,
  type FollowCounts,
} from "@/features/profile/api";
import {
  mapUserProfileToHeaderVM,
  type HeaderViewModel,
} from "@/features/profile/mappers/mapUserProfileToHeaderVM";

export type { FollowCounts };

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

  hollow_hold_sec?: PerfDatum;

  weighted_pullup_kg?: PerfDatum;
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
    height?: number;
    weight?: number;
    arm_span?: number;
    ape_index?: number;
    mobility_band?: number | null;
    level?: string | null;
    sit_and_reach_cm?: number;
  };

  performance?: Performance;
  ability_scores?: AbilityScores;

  capacity?: {
    max_pullups?: number;
    weighted_pullup_kg?: number;
  };
  finger_strength?: {
    protocol?: "maxhang" | "repeater" | null;
    edge_mm?: number | null;
    grip?: "half_crimp" | "open_hand" | "full_crimp" | null;
    fingers?: number | null;
    added_weight_kg?: number | null;
    hang_seconds?: number | null;
    index?: number | null;
    ref_edge_mm?: number;
    ref_grip?: "half_crimp";
    ref_fingers?: number;
    ref_hang_seconds?: number;
    version?: number;
    updated_at?: string;
  };
  climbing_background?: {
    discipline?: string;
    preferred_angle?: string;
    experience_years?: number;
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

type State = {
  // me
  profile?: Profile;
  headerVM: HeaderViewModel | null;

  // other cache
  profilesById: Record<string, Profile>;
  headerVMById: Record<string, HeaderViewModel>;
  followCountsById: Record<string, FollowCounts>;

  loading: boolean;
  saving: boolean;
  error?: string;
};

type Actions = {
  fetchMe: () => Promise<void>;
  updateMe: (partial: Partial<Profile>) => Promise<void>;
  upsertPerformance: (perfPatch: Record<string, any>) => Promise<void>;

  // ✅ NEW
  fetchByUserId: (userId: string) => Promise<Profile | null>;
  fetchFollowCounts: (userId?: string) => Promise<FollowCounts>;
};

function normalizeForHeaderVM(p: any) {
  const a = p?.anthropometrics ?? null;

  const height = a?.height ?? (a?.height_cm != null ? a.height_cm : null);
  const weight = a?.weight ?? (a?.weight_kg != null ? a.weight_kg : null);

  return {
    ...p,
    anthropometrics: a
      ? {
          ...a,
          height,
          weight,
          ape_index: a?.ape_index ?? null,
          sit_and_reach_cm: a?.sit_and_reach_cm ?? null,
        }
      : null,
  };
}

export const useProfileStore = create<State & Actions>((set, get) => ({
  headerVM: null,
  profilesById: {},
  headerVMById: {},
  followCountsById: {},

  loading: false,
  saving: false,

  async fetchMe() {
    set({ loading: true, error: undefined });
    try {
      const data = await getMyProfile<Profile>();
      set({
        profile: data,
        headerVM: mapUserProfileToHeaderVM(data),
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  async fetchByUserId(userId) {
    set({ loading: true, error: undefined });
    try {
      const data = await getProfileByUserId<Profile>(userId);
      const normalized = normalizeForHeaderVM(data);
      const vm = mapUserProfileToHeaderVM(normalized);

      set((s) => ({
        loading: false,
        profilesById: { ...s.profilesById, [userId]: data },
        headerVMById: { ...s.headerVMById, [userId]: vm },
      }));

      return data;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  async fetchFollowCounts(userId) {
    try {
      const counts = await getFollowCounts(userId);
      if (userId) {
        set((s) => ({
          followCountsById: { ...s.followCountsById, [userId]: counts },
        }));
      }
      return counts;
    } catch {
      const counts = { followers: 0, following: 0 };
      if (userId) {
        set((s) => ({
          followCountsById: { ...s.followCountsById, [userId]: counts },
        }));
      }
      return counts;
    }
  },

  async updateMe(partial) {
    set({ saving: true });
    const prev = get().profile;

    if (prev) {
      const optimistic = { ...prev, ...partial };
      const normalizedOpt = normalizeForHeaderVM(optimistic);
      set({
        profile: optimistic,
        headerVM: mapUserProfileToHeaderVM(normalizedOpt),
      });
    }

    try {
      const data = await updateMyProfile<Profile>(partial);
      set({
        profile: data,
        headerVM: mapUserProfileToHeaderVM(data),
        saving: false,
      });
    } catch (e) {
      set({ saving: false });
      console.error("Update profile failed", e);
    }
  },

  async upsertPerformance(perfPatch) {
    set({ saving: true });
    try {
      const data = await upsertMyPerformance<Profile>(perfPatch);
      set({
        profile: data,
        headerVM: mapUserProfileToHeaderVM(data),
        saving: false,
      });
    } catch (e) {
      set({ saving: false });
      console.error("Upsert performance failed", e);
    }
  },
}));
