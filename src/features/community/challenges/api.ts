import { api } from '../../../lib/apiClient';
import type { ChallengeOut, ChallengeLeaderboardEntry } from './types';
import { mapRawChallenge, mapRawLeaderboardEntry } from './types';

export const challengeApi = {
  /** Get published challenges list */
  getChallenges: async (opts?: { category?: string; limit?: number }): Promise<ChallengeOut[]> => {
    const params = new URLSearchParams();
    if (opts?.category) params.set('category', opts.category);
    params.set('limit', String(opts?.limit ?? 50));
    const raw = await api.get<any[]>(`/challenges?${params.toString()}`);
    return raw.map(mapRawChallenge);
  },

  /** Get single challenge detail */
  getDetail: async (challengeId: string): Promise<ChallengeOut> => {
    const raw = await api.get<any>(`/challenges/${challengeId}`);
    return mapRawChallenge(raw);
  },

  /** Get user's joined challenges */
  getMyChallenges: async (): Promise<ChallengeOut[]> => {
    const raw = await api.get<any[]>('/challenges/my');
    return raw.map(mapRawChallenge);
  },

  /** Join a challenge */
  join: (challengeId: string) =>
    api.post<{ joined: boolean }>(`/challenges/${challengeId}/join`),

  /** Leave a challenge */
  leave: (challengeId: string) =>
    api.post<{ joined: boolean }>(`/challenges/${challengeId}/leave`),

  /** Get challenge leaderboard */
  getLeaderboard: async (challengeId: string, limit = 50): Promise<ChallengeLeaderboardEntry[]> => {
    const raw = await api.get<any[]>(
      `/challenges/${challengeId}/leaderboard?limit=${limit}`
    );
    return raw.map(mapRawLeaderboardEntry);
  },

  /** Toggle like on challenge */
  toggleLike: (challengeId: string) =>
    api.post<{ liked: boolean; like_count: number }>(
      `/challenges/${challengeId}/like`
    ),

  /** Toggle save on challenge */
  toggleSave: (challengeId: string) =>
    api.post<{ saved: boolean; save_count: number }>(
      `/challenges/${challengeId}/save`
    ),
};
