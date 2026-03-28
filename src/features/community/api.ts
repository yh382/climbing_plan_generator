// src/features/community/api.ts
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../../lib/apiClient';
import type {
  UserPostCreateIn,
  UserPostOut,
  RankOut,
  BadgeProgressOut,
  NotificationOut,
  FeedItem,
  BlockedUserOut,
  MentionOut,
  PickedMediaItem,
} from './types';

// --- Media upload helpers ---

async function toFileUri(uri: string): Promise<string> {
  if (!uri.startsWith('ph://')) return uri;
  const ext = 'jpg'; // iOS Photos Library assets
  const dest = `${FileSystem.cacheDirectory}upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

type PresignResponse = { upload_url: string; public_url: string; key: string };

export async function uploadPostMedia(
  items: PickedMediaItem[]
): Promise<Array<{ type: 'image' | 'video'; url: string }>> {
  return Promise.all(
    items.map(async (item) => {
      const fileUri = await toFileUri(item.uri);
      const contentType = item.mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

      const { upload_url, public_url } = await api.post<PresignResponse>(
        '/upload/presign',
        { category: 'posts', content_type: contentType }
      );

      const result = await FileSystem.uploadAsync(upload_url, fileUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      });

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Upload failed: ${result.status}`);
      }

      return { type: item.mediaType, url: public_url };
    })
  );
}

export const communityApi = {
  // === Posts ===
  getPublicPosts: (skip = 0, limit = 20, sort: 'latest' | 'hot' = 'latest') =>
    api.get<any[]>(`/posts?skip=${skip}&limit=${limit}&sort=${sort}`),

  createPost: (data: UserPostCreateIn) =>
    api.post<UserPostOut>('/posts', data),

  getMyPosts: (skip = 0, limit = 20) =>
    api.get<UserPostOut[]>(`/posts/me?skip=${skip}&limit=${limit}`),

  getUserPosts: (userId: string, skip = 0, limit = 20) =>
    api.get<UserPostOut[]>(`/posts/user/${userId}?skip=${skip}&limit=${limit}`),

  getGymPosts: (gymId: string, skip = 0, limit = 20) =>
    api.get<any[]>(`/posts?gym_id=${gymId}&skip=${skip}&limit=${limit}`),

  getPost: (postId: string) =>
    api.get<any>(`/posts/${postId}`),

  updatePost: (postId: string, data: { content_text?: string; media?: any[]; visibility?: string }) =>
    api.patch<any>(`/posts/${postId}`, data),

  deletePost: (postId: string) =>
    api.del(`/posts/${postId}`),

  likePost: (postId: string) =>
    api.post(`/posts/${postId}/like`),

  unlikePost: (postId: string) =>
    api.del(`/posts/${postId}/like`),

  // === Feed ===
  getFollowingFeed: (limit = 20, offset = 0) =>
    api.get<{ items: any[]; has_more: boolean; next_offset: number }>(
      `/feed/following?limit=${limit}&offset=${offset}`
    ),

  getHomeFeed: () =>
    api.get<any>('/feed/home'),

  // === Follow ===
  followUser: (userId: string) =>
    api.post(`/profiles/${userId}/follow`),

  unfollowUser: (userId: string) =>
    api.del(`/profiles/${userId}/follow`),

  getFollowers: (userId: string, limit = 20, offset = 0) =>
    api.get(`/profiles/${userId}/followers?limit=${limit}&offset=${offset}`),

  getFollowing: (userId: string, limit = 20, offset = 0) =>
    api.get(`/profiles/${userId}/following?limit=${limit}&offset=${offset}`),

  getPublicProfile: (userId: string) =>
    api.get(`/profiles/${userId}`),

  // === Notifications ===
  getNotifications: (skip = 0, limit = 20, unreadOnly = false) =>
    api.get<NotificationOut[]>(`/notifications?skip=${skip}&limit=${limit}&unread_only=${unreadOnly}`),

  getUnreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post('/notifications/mark-all-read'),

  // === Badges ===
  getMyBadgesProgress: () =>
    api.get<BadgeProgressOut[]>('/badges/my/progress'),

  // === Rank ===
  getLeaderboard: (
    type = 'total',
    scope = 'all',
    gymId?: string | null,
    limit = 50,
    offset = 0,
  ) => {
    let url = `/leaderboard?type=${type}&scope=${scope}&limit=${limit}&offset=${offset}`;
    if (gymId) url += `&gym_id=${gymId}`;
    return api.get<{ items: any[]; total: number }>(url);
  },

  getMyRank: () =>
    api.get<RankOut>('/rank/me'),

  // === Search ===
  searchUsers: (q: string, limit = 20) =>
    api.get(`/profiles/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  // === Comments ===
  getMyComments: (skip = 0, limit = 50) =>
    api.get<any[]>(`/users/me/comments?skip=${skip}&limit=${limit}`),

  getComments: (postId: string, skip = 0, limit = 50) =>
    api.get<any[]>(`/posts/${postId}/comments?skip=${skip}&limit=${limit}`),

  createComment: (postId: string, contentText: string, parentId?: string) => {
    const body: Record<string, any> = { content_text: contentText };
    if (parentId) body.parent_id = parentId;
    return api.post<any>(`/posts/${postId}/comments`, body);
  },

  deleteComment: (postId: string, commentId: string) =>
    api.del(`/posts/${postId}/comments/${commentId}`),

  getReplies: (postId: string, commentId: string, skip = 0, limit = 50) =>
    api.get<any[]>(`/posts/${postId}/comments/${commentId}/replies?skip=${skip}&limit=${limit}`),

  report: (targetType: 'user' | 'post', targetId: string, reason: string, description?: string) =>
    api.post('/reports', { target_type: targetType, target_id: targetId, reason, description }),

  // === Save / Unsave ===
  savePost: (postId: string) =>
    api.post(`/posts/${postId}/save`),

  unsavePost: (postId: string) =>
    api.del(`/posts/${postId}/save`),

  // === Saved / Liked lists ===
  getSavedPosts: (skip = 0, limit = 20) =>
    api.get<any[]>(`/posts/saved?skip=${skip}&limit=${limit}`),

  getLikedPosts: (skip = 0, limit = 20) =>
    api.get<any[]>(`/posts/liked?skip=${skip}&limit=${limit}`),

  // === Notification preferences ===
  getNotificationPreferences: () =>
    api.get<any>('/notifications/preferences'),

  updateNotificationPreferences: (prefs: Record<string, boolean>) =>
    api.patch<any>('/notifications/preferences', prefs),

  // === Block ===
  blockUser: (userId: string) =>
    api.post(`/users/${userId}/block`),

  unblockUser: (userId: string) =>
    api.del(`/users/${userId}/block`),

  getBlockedUsers: (skip = 0, limit = 50) =>
    api.get<BlockedUserOut[]>(`/users/me/blocked?skip=${skip}&limit=${limit}`),

  // === Mentions ===
  getMentions: (skip = 0, limit = 20) =>
    api.get<MentionOut[]>(`/users/me/mentions?skip=${skip}&limit=${limit}`),
};
