// src/store/useCommunityStore.ts
import { create } from 'zustand';
import { FeedPost } from '../types/community';
import { communityApi } from '../features/community/api';
import type { UserPostOut, UserPostCreateIn } from '../features/community/types';
import { mapRawPost, toFeedPost } from '../features/community/utils';
import { handleAwardedBadges } from './useBadgeUnlockStore';

type FeedMode = 'all' | 'following';
type FeedSort = 'latest' | 'hot';

interface CommunityState {
  // Feed
  posts: FeedPost[];
  feedLoading: boolean;
  feedError: string | null;
  feedMode: FeedMode;
  feedSort: FeedSort;

  // My posts
  myPosts: FeedPost[];

  // Actions
  setFeedMode: (mode: FeedMode) => void;
  setFeedSort: (sort: FeedSort) => void;
  fetchFeed: (refresh?: boolean) => Promise<void>;
  fetchMyPosts: () => Promise<void>;
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
  feedSort: 'hot' as FeedSort,
  myPosts: [],

  setFeedMode: (mode) => {
    if (mode === get().feedMode) return;
    set({ feedMode: mode });
    get().fetchFeed(true);
  },

  setFeedSort: (sort) => {
    if (sort === get().feedSort) return;
    set({ feedSort: sort });
    get().fetchFeed(true);
  },

  fetchFeed: async (refresh = false) => {
    if (get().feedLoading && !refresh) return;
    set({ feedLoading: true, feedError: null });
    try {
      const mode = get().feedMode;
      const sort = get().feedSort;
      let posts: FeedPost[];

      if (mode === 'following') {
        const res = await communityApi.getFollowingFeed(50, 0);
        // Filter only "post" type items from the mixed following feed
        const postItems = (res.items ?? []).filter((i: any) => i.type === 'post');
        posts = postItems.map((i: any) => toFeedPost(mapRawPost(i.item)));
      } else {
        const raw = await communityApi.getPublicPosts(0, 50, sort);
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
