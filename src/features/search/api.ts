import { api } from '../../lib/apiClient';
import { challengeApi } from '../community/challenges/api';
import { eventApi } from '../community/events/api';
import type { ChallengeOut } from '../community/challenges/types';
import type { EventOut } from '../community/events/types';

export interface SearchUserResult {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

export interface RecommendedUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  boulder_max: string | null;
  total_sends: number;
  mutual_count: number;
}

export const searchApi = {
  searchUsers: async (q: string, limit = 5): Promise<SearchUserResult[]> => {
    const raw = await api.get<any[]>(
      `/profiles/search?q=${encodeURIComponent(q)}&limit=${limit}`
    );
    return raw.map((r) => ({
      id: r.user_id ?? r.id,
      displayName: r.display_name || r.username,
      username: r.username,
      avatarUrl: r.avatar_url,
      bio: r.bio,
    }));
  },

  searchChallenges: async (q: string): Promise<ChallengeOut[]> => {
    const all = await challengeApi.getChallenges({ limit: 100 });
    const lower = q.toLowerCase();
    return all
      .filter((c) => c.title.toLowerCase().includes(lower))
      .slice(0, 5);
  },

  getRecommendedUsers: async (): Promise<RecommendedUser[]> => {
    return api.get<RecommendedUser[]>('/profiles/recommended');
  },

  searchEvents: async (q: string): Promise<EventOut[]> => {
    const all = await eventApi.getEvents(100);
    const lower = q.toLowerCase();
    return all
      .filter((e) => e.title.toLowerCase().includes(lower))
      .slice(0, 5);
  },
};
