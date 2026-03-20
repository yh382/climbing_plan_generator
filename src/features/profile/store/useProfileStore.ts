import { create } from "zustand";
import { api } from "@/lib/apiClient";
import {
  mapUserProfileToHeaderVM,
  type HeaderViewModel,
} from "@/features/profile/mappers/mapUserProfileToHeaderVM";

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

export type FollowCounts = { followers: number; following: number };

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

async function safeGetProfileByUserId(userId: string): Promise<Profile> {
  // 你后端目前大概率是 /profiles/{userId}
  // 做一个轻量 fallback，避免你后端 path 命名不同
  try {
    return await api.get<Profile>(`/profiles/${userId}`);
  } catch {
    // 备用：有些项目会是 /profiles/by_user/{id}
    return await api.get<Profile>(`/profiles/by_user/${userId}`);
  }
}

async function safeGetFollowCounts(userId?: string): Promise<FollowCounts> {
  // me
  if (!userId) {
    const res = await api.get<FollowCounts>("/profiles/me/follow_counts");
    return {
      followers: Number(res?.followers ?? 0),
      following: Number(res?.following ?? 0),
    };
  }

  // other user
  // 建议后端加：GET /profiles/{userId}/follow_counts
  try {
    const res = await api.get<FollowCounts>(`/profiles/${userId}/follow_counts`);
    return {
      followers: Number(res?.followers ?? 0),
      following: Number(res?.following ?? 0),
    };
  } catch {
    // 如果你后端未来用 /profiles/{id}/follow_counts（id=profile_id），这里再加一层 fallback：
    const res = await api.get<FollowCounts>(`/profiles/${userId}/follow_counts`);
    return {
      followers: Number(res?.followers ?? 0),
      following: Number(res?.following ?? 0),
    };
  }
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
      const data = await api.get<Profile>("/profiles/me");
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
      const data = await safeGetProfileByUserId(userId);
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
      const counts = await safeGetFollowCounts(userId);
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
      const data = await api.put<Profile>("/profiles/me", partial);
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
      const data = await api.post<Profile>("/profiles/me/performance", perfPatch);
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
