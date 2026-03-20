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

export const searchApi = {
  searchUsers: async (q: string, limit = 5): Promise<SearchUserResult[]> => {
    return api.get<SearchUserResult[]>(
      `/profiles/search?q=${encodeURIComponent(q)}&limit=${limit}`
    );
  },

  searchChallenges: async (q: string): Promise<ChallengeOut[]> => {
    const all = await challengeApi.getChallenges({ limit: 100 });
    const lower = q.toLowerCase();
    return all
      .filter((c) => c.title.toLowerCase().includes(lower))
      .slice(0, 5);
  },

  searchEvents: async (q: string): Promise<EventOut[]> => {
    const all = await eventApi.getEvents(100);
    const lower = q.toLowerCase();
    return all
      .filter((e) => e.title.toLowerCase().includes(lower))
      .slice(0, 5);
  },
};
