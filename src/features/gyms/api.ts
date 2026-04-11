import { api } from '../../lib/apiClient';
import { sanitizeImageUrl } from '../../lib/imageUtils';

// ---- Types ----

export interface GymLogItem {
  id: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
  grade_text: string;
  grade_score: number;
  result: string;
  feel?: string;
  wall_type: string;
  created_at: string;
}

export interface GymSessionItem {
  id: string;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  date: string;
  duration_minutes?: number;
  log_count: number;
  send_count: number;
  top_grade?: string;
  created_at: string;
}

export interface GymStats {
  total_sends: number;
  unique_users: number;
  weekly_active: number;
  boulder_distribution: Array<{ grade_text: string; grade_score: number; count: number }>;
  rope_distribution: Array<{ grade_text: string; grade_score: number; count: number }>;
  popular_grades: string[];
  grade_feel?: string;        // "Soft" | "Fair" | "Stiff" | null
  grade_feel_score?: number;  // raw [-1, 1]
}

export interface GymMember {
  user_id: string;
  username?: string;
  avatar_url?: string;
  total_points: number;
  last_active?: string;
  send_count: number;
  joined_at?: string;
}

export interface GymSummary {
  gym_id: string;
  name: string;
  place_id?: string;
  is_favorited: boolean;
  weekly_active: number;
  total_sends: number;
}

export interface RecentGym {
  gym_id: string;
  name: string;
  place_id?: string;
  last_session_date: string;
  is_favorited: boolean;
}

// ---- API ----

export const gymCommunityApi = {
  getActivity: async (gymId: string, limit = 20, offset = 0) => {
    const res = await api.get<{ items: GymSessionItem[]; total: number }>(
      `/gyms/${gymId}/activity?limit=${limit}&offset=${offset}`
    );
    res.items.forEach(i => { i.avatar_url = sanitizeImageUrl(i.avatar_url) ?? undefined; });
    return res;
  },

  getStats: (gymId: string) =>
    api.get<GymStats>(`/gyms/${gymId}/stats`),

  getMembers: async (gymId: string, limit = 50, offset = 0) => {
    const res = await api.get<{ items: GymMember[]; total: number }>(
      `/gyms/${gymId}/members?limit=${limit}&offset=${offset}`
    );
    res.items.forEach(m => { m.avatar_url = sanitizeImageUrl(m.avatar_url) ?? undefined; });
    return res;
  },

  /** Ensure gym exists in DB, returns gym_id */
  ensureGym: (placeId: string) =>
    api.post<{ gym_id: string; place_id: string; name: string }>(
      `/gyms/ensure?place_id=${encodeURIComponent(placeId)}`
    ),

  // ---- Favorites ----

  favoriteGym: (gymId: string) =>
    api.post<{ ok: boolean }>(`/gyms/${gymId}/favorite`),

  unfavoriteGym: (gymId: string) =>
    api.del<{ ok: boolean }>(`/gyms/${gymId}/favorite`),

  getFavoriteGyms: () =>
    api.get<{ items: GymSummary[] }>('/gyms/favorites'),

  // ---- Entry point data ----

  getRecentGym: () =>
    api.get<RecentGym | null>('/gyms/my-recent'),

  getPopularGyms: (limit = 10) =>
    api.get<GymSummary[]>(`/gyms/popular?limit=${limit}`),
};
