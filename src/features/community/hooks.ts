// src/features/community/hooks.ts

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient';
import { sanitizeImageUrl } from '../../lib/imageUtils';
import { communityApi } from './api';
import { mapRawPost, toFeedPost } from './utils';
import type { FeedPost as FeedPostType } from '../../types/community';

// ---- Types ----

export interface BadgeProgress {
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: 'challenge' | 'milestone' | 'influence' | 'monthly' | 'skill' | 'lifetime' | 'special';
  tier: string | null;
  isAwarded: boolean;
  awardedAt: string | null;
  progress: number;
  currentValue: number;
  threshold: number;
  sourceType?: string | null;
  sourceId?: string | null;
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  meta: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
}

export interface LeaderboardItem {
  userId: string;
  username: string;
  avatarUrl: string | null;
  rank: number;
  score: number;
}

export interface PrivacyFlags {
  posts: boolean;
  body_info: boolean;
  analysis: boolean;
  plans: boolean;
  badges: boolean;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  location: string | null;
  homeGym: string | null;
  boulderMax: string | null;
  routeMax: string | null;
  totalSends: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  privacy: PrivacyFlags | null;
}

export interface UserPost {
  id: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
    homeGym?: string;
  };
  timestamp: string;
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  isLiked: boolean;
  isSaved: boolean;
}

// ---- Badges ----
export function useBadgesProgress() {
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<BadgeProgress[]>('/badges/my/progress');
      setBadges(data);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBadges(); }, [fetchBadges]);
  return { badges, loading, error, refresh: fetchBadges };
}

// ---- Notifications ----
function mapRawNotification(d: any): Notification {
  return {
    id: d.id,
    kind: d.kind,
    title: d.title,
    body: d.body ?? null,
    meta: d.meta ?? null,
    readAt: d.read_at ?? d.readAt ?? null,
    createdAt: d.created_at ?? d.createdAt,
  };
}
export function useNotifications(limit = 20) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [data, countRes] = await Promise.all([
        api.get<any[]>(`/notifications?limit=${limit}`),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications((data as any[]).map(mapRawNotification));
      setUnreadCount(countRes.count || 0);
    } catch (_e) { /* swallow */ }
    finally { setLoading(false); }
  }, [limit]);

  const markRead = async (id: string) => {
    // Optimistic update first so UI reflects immediately even if component unmounts
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await api.post(`/notifications/${id}/read`);
    } catch { /* swallow — optimistic update already applied */ }
  };

  const markAllRead = async () => {
    // Optimistic update first
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await api.post('/notifications/mark-all-read');
    } catch { /* swallow */ }
  };

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  return { notifications, unreadCount, loading, refresh: fetchNotifications, markRead, markAllRead };
}

// ---- Leaderboard ----
export function useLeaderboard(
  type = 'total',
  scope = 'all',
  gymId?: string | null,
  limit = 50,
) {
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await communityApi.getLeaderboard(type, scope, gymId, limit);
      const mapped = (data.items || []).map((r: any, idx: number) => ({
        userId: r.user_id,
        username: r.username,
        avatarUrl: sanitizeImageUrl(r.avatar_url),
        rank: r.rank_position ?? idx + 1,
        score: r.points ?? (
          type === 'boulder' ? r.boulder_points
          : type === 'rope' ? r.rope_points
          : r.total_points
        ),
      }));
      setItems(mapped);
      setTotal(data.total || 0);
    } catch (_e) { /* swallow */ }
    finally { setLoading(false); }
  }, [type, scope, gymId, limit]);

  useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);
  return { items, total, loading, refresh: fetchLeaderboard };
}

// ---- Public Profile ----
export interface PublicPlan {
  id: string;
  title: string;
  source: string;
  status: string;
  trainingType: string;
  durationWeeks: number | null;
  createdAt: string | null;
}

export interface PublicBadge {
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
  category: string;
  tier: string | null;
  awardedAt: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
}

export function usePublicProfile(userId: string | null) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [badges, setBadges] = useState<PublicBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [raw, postsData, plansData, badgesData] = await Promise.all([
        api.get<any>(`/profiles/${userId}`),
        api.get<any[]>(`/posts/user/${userId}?limit=20`),
        api.get<any[]>(`/plans/user/${userId}`).catch(() => []),
        api.get<any[]>(`/badges/user/${userId}`).catch(() => []),
      ]);
      const mapped: PublicProfile = {
        id: raw.user_id ?? raw.id,
        username: raw.username,
        displayName: raw.display_name || raw.displayName || raw.username,
        avatarUrl: sanitizeImageUrl(raw.avatar_url ?? raw.avatarUrl),
        coverUrl: sanitizeImageUrl(raw.cover_url ?? raw.coverUrl),
        bio: raw.bio ?? null,
        location: raw.location ?? null,
        homeGym: raw.home_gym ?? raw.homeGym ?? null,
        boulderMax: raw.boulder_max ?? raw.boulderMax ?? null,
        routeMax: raw.route_max ?? raw.routeMax ?? null,
        totalSends: raw.total_sends ?? raw.totalSends ?? 0,
        followersCount: raw.followers_count ?? raw.followersCount ?? 0,
        followingCount: raw.following_count ?? raw.followingCount ?? 0,
        isFollowing: raw.is_following ?? raw.isFollowing ?? false,
        privacy: raw.privacy ?? null,
      };
      setProfile(mapped);
      // Map posts through existing mapRawPost → toFeedPost pipeline
      const feedPosts = (postsData || []).map((d: any) => toFeedPost(mapRawPost(d)));
      setPosts(feedPosts);
      setPlans(plansData || []);
      setBadges(badgesData || []);
    } catch (_e) { /* swallow */ }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  return { profile, posts, plans, badges, loading, refresh: fetchProfile };
}

// ---- Search Users ----
export function useSearchUsers() {
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<PublicProfile[]>(
        `/profiles/search?q=${encodeURIComponent(query)}&limit=20`
      );
      setResults(data);
    } catch (_e) { /* swallow */ }
    finally { setLoading(false); }
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, clear };
}
