// src/store/useCommunityStore.ts
import { create } from 'zustand';
import { FeedPost } from '../types/community';
import { communityApi } from '../features/community/api';
import type { UserPostOut, UserPostCreateIn } from '../features/community/types';
import { mapRawPost, toFeedPost } from '../features/community/utils';
import { handleAwardedBadges } from './useBadgeUnlockStore';

type FeedMode = 'all' | 'following';

const ACTIVITY_PAGE_SIZE = 24;

// Window BG — Profile Activity feed: per-user polymorphic post cache
// (Media + Sessions both derive from this via FE-side filter). Replaces
// the legacy `userSendsByUserId` cache (server-side filtered to
// attachment_type=log) which BG retired alongside SendsSection.tsx.
export interface UserActivityCache {
  items: FeedPost[];
  nextSkip: number;
  loading: boolean;
  exhausted: boolean;
  error: string | null;
}

interface CommunityState {
  // Feed
  posts: FeedPost[];
  feedLoading: boolean;
  feedError: string | null;
  feedMode: FeedMode;

  // My posts
  myPosts: FeedPost[];

  // Window BG — Profile Activity: per-user polymorphic post cache
  // (Media + Sessions sub-sections derive from this with FE filters).
  // Replaces the legacy β userSendsByUserId cache retired with
  // SendsSection.tsx.
  userActivityByUserId: Record<string, UserActivityCache>;

  // Actions
  setFeedMode: (mode: FeedMode) => void;
  fetchFeed: (refresh?: boolean) => Promise<void>;
  fetchMyPosts: () => Promise<void>;
  fetchUserActivity: (userId: string, refresh?: boolean) => Promise<void>;
  loadMoreUserActivity: (userId: string) => Promise<void>;
  createPost: (data: UserPostCreateIn) => Promise<UserPostOut>;
  updatePost: (postId: string, data: { content_text?: string; media?: any[]; visibility?: string }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  updateCommentCount: (postId: string, delta: number) => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  feedLoading: false,
  feedError: null,
  feedMode: 'all' as FeedMode,
  myPosts: [],
  userActivityByUserId: {},

  setFeedMode: (mode) => {
    if (mode === get().feedMode) return;
    set({ feedMode: mode });
    get().fetchFeed(true);
  },

  fetchFeed: async (refresh = false) => {
    if (get().feedLoading && !refresh) return;
    set({ feedLoading: true, feedError: null });
    try {
      const mode = get().feedMode;
      let posts: FeedPost[];

      if (mode === 'following') {
        const res = await communityApi.getFollowingFeed(50, 0);
        // Filter only "post" type items from the mixed following feed
        const postItems = (res.items ?? []).filter((i: any) => i.type === 'post');
        posts = postItems.map((i: any) => toFeedPost(mapRawPost(i.item)));
      } else {
        const raw = await communityApi.getPublicPosts(0, 50, 'recommended');
        posts = (raw as any[]).map((r) => toFeedPost(mapRawPost(r)));
      }

      set({ posts, feedLoading: false });
    } catch (e: any) {
      if (__DEV__) console.warn('fetchFeed error:', e?.message);
      set({ feedError: e?.message || 'Failed to load feed', feedLoading: false });
    }
  },

  fetchMyPosts: async () => {
    try {
      const raw = await communityApi.getMyPosts();
      set({ myPosts: (raw as any[]).map((r) => toFeedPost(mapRawPost(r))) });
    } catch (e: any) {
      if (__DEV__) console.warn('fetchMyPosts error:', e?.message);
    }
  },

  fetchUserActivity: async (userId, refresh = false) => {
    const cache = get().userActivityByUserId[userId];
    if (cache?.loading && !refresh) return;
    set((state) => ({
      userActivityByUserId: {
        ...state.userActivityByUserId,
        [userId]: {
          items: refresh ? [] : cache?.items ?? [],
          nextSkip: refresh ? 0 : cache?.nextSkip ?? 0,
          loading: true,
          exhausted: false,
          error: null,
        },
      },
    }));
    try {
      const raw = await communityApi.getUserPosts(userId, 0, ACTIVITY_PAGE_SIZE);
      const items = (raw as any[]).map((r) => toFeedPost(mapRawPost(r)));
      set((state) => ({
        userActivityByUserId: {
          ...state.userActivityByUserId,
          [userId]: {
            items,
            nextSkip: items.length,
            loading: false,
            exhausted: items.length < ACTIVITY_PAGE_SIZE,
            error: null,
          },
        },
      }));
    } catch (e: any) {
      if (__DEV__) console.warn('fetchUserActivity error:', e?.message);
      set((state) => ({
        userActivityByUserId: {
          ...state.userActivityByUserId,
          [userId]: {
            items: state.userActivityByUserId[userId]?.items ?? [],
            nextSkip: state.userActivityByUserId[userId]?.nextSkip ?? 0,
            loading: false,
            exhausted: state.userActivityByUserId[userId]?.exhausted ?? false,
            error: e?.message ?? 'Failed to load activity',
          },
        },
      }));
    }
  },

  loadMoreUserActivity: async (userId) => {
    const cache = get().userActivityByUserId[userId];
    if (!cache || cache.loading || cache.exhausted) return;
    const skip = cache.nextSkip;
    set((state) => ({
      userActivityByUserId: {
        ...state.userActivityByUserId,
        [userId]: { ...cache, loading: true, error: null },
      },
    }));
    try {
      const raw = await communityApi.getUserPosts(userId, skip, ACTIVITY_PAGE_SIZE);
      const more = (raw as any[]).map((r) => toFeedPost(mapRawPost(r)));
      set((state) => {
        const current = state.userActivityByUserId[userId];
        const merged = [...(current?.items ?? []), ...more];
        return {
          userActivityByUserId: {
            ...state.userActivityByUserId,
            [userId]: {
              items: merged,
              nextSkip: merged.length,
              loading: false,
              exhausted: more.length < ACTIVITY_PAGE_SIZE,
              error: null,
            },
          },
        };
      });
    } catch (e: any) {
      if (__DEV__) console.warn('loadMoreUserActivity error:', e?.message);
      set((state) => {
        const current = state.userActivityByUserId[userId];
        return {
          userActivityByUserId: {
            ...state.userActivityByUserId,
            [userId]: {
              ...(current ?? { items: [], nextSkip: 0, exhausted: false }),
              loading: false,
              error: e?.message ?? 'Failed to load more activity',
            } as UserActivityCache,
          },
        };
      });
    }
  },

  createPost: async (data) => {
    const raw = await communityApi.createPost(data);
    handleAwardedBadges(raw);
    const mapped = mapRawPost(raw);
    // Optimistic: prepend to feed
    const newPost = toFeedPost(mapped);
    set((state) => ({
      posts: [newPost, ...state.posts.filter(p => p.id !== newPost.id)],
      myPosts: [newPost, ...state.myPosts.filter(p => p.id !== newPost.id)],
    }));
    return mapped;
  },

  updatePost: async (postId, data) => {
    try {
      const raw = await communityApi.updatePost(postId, data);
      const mapped = mapRawPost(raw);
      const updated = toFeedPost(mapped);
      const replace = (posts: FeedPost[]) =>
        posts.map(p => p.id === postId ? updated : p);
      set((state) => ({
        posts: replace(state.posts),
        myPosts: replace(state.myPosts),
      }));
    } catch (e: any) {
      if (__DEV__) console.warn('updatePost error:', e?.message);
      throw e;
    }
  },

  deletePost: async (postId) => {
    // Optimistic removal
    set((state) => ({
      posts: state.posts.filter(p => p.id !== postId),
      myPosts: state.myPosts.filter(p => p.id !== postId),
    }));
    try {
      await communityApi.deletePost(postId);
    } catch (e: any) {
      if (__DEV__) console.warn('deletePost error:', e?.message);
      // Refetch on error to restore state
      get().fetchFeed(true);
    }
  },

  toggleLike: async (postId) => {
    const post = get().posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;

    // Optimistic update
    const updateLike = (posts: FeedPost[]) =>
      posts.map(p => p.id === postId ? {
        ...p,
        isLiked: !wasLiked,
        likes: wasLiked ? p.likes - 1 : p.likes + 1,
      } : p);

    set((state) => ({
      posts: updateLike(state.posts),
      myPosts: updateLike(state.myPosts),
    }));

    try {
      if (wasLiked) {
        await communityApi.unlikePost(postId);
      } else {
        await communityApi.likePost(postId);
      }
    } catch (e: any) {
      if (__DEV__) console.warn('toggleLike error:', e?.message);
      // Revert on error
      set((state) => ({
        posts: updateLike(state.posts),
        myPosts: updateLike(state.myPosts),
      }));
    }
  },

  toggleSave: async (postId) => {
    const post = get().posts.find(p => p.id === postId);
    if (!post) return;

    const wasSaved = post.isSaved;

    // Optimistic update
    const updateSave = (posts: FeedPost[]) =>
      posts.map(p => p.id === postId ? { ...p, isSaved: !wasSaved } : p);

    set((state) => ({
      posts: updateSave(state.posts),
      myPosts: updateSave(state.myPosts),
    }));

    try {
      if (wasSaved) {
        await communityApi.unsavePost(postId);
      } else {
        await communityApi.savePost(postId);
      }
    } catch (e: any) {
      if (__DEV__) console.warn('toggleSave error:', e?.message);
      // Revert on error
      set((state) => ({
        posts: updateSave(state.posts),
        myPosts: updateSave(state.myPosts),
      }));
    }
  },

  updateCommentCount: (postId, delta) => {
    const update = (posts: FeedPost[]) =>
      posts.map(p => p.id === postId
        ? { ...p, comments: Math.max(0, p.comments + delta) }
        : p
      );
    set((state) => ({
      posts: update(state.posts),
      myPosts: update(state.myPosts),
    }));
  },
}));
