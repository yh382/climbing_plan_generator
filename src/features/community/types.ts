// src/features/community/types.ts
// Backend-aligned types for community feature

export interface PickedMediaItem {
  id: string;
  uri: string;
  mediaType: 'image' | 'video';
  width: number;
  height: number;
  duration?: number;
  coverUri?: string;
}

// --- Request types (snake_case, matching backend Pydantic models) ---

export interface UserPostCreateIn {
  content_text?: string;
  media?: Array<{ type: 'image' | 'video'; url: string; thumb_url?: string }>;
  attachment_type?: 'plan' | 'log' | 'session';
  attachment_id?: string;
  attachment_meta?: Record<string, any>;
  visibility?: 'public' | 'followers' | 'private';
  gym_id?: string;
}

// --- Response types (camelCase, matching backend serializers) ---

export interface UserPostOut {
  id: string;
  userId: string;
  authorName?: string;
  authorAvatar?: string;
  contentText?: string;
  media?: Array<{ type: string; url: string; thumbUrl?: string }>;
  attachmentType?: string;
  attachmentId?: string;
  attachmentMeta?: Record<string, any>;
  visibility: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  gymId?: string;
  gymName?: string;
}

export interface RankOut {
  userId: string;
  username?: string;
  avatarUrl?: string;
  totalPoints: number;
  boulderPoints: number;
  ropePoints: number;
  rankPosition?: number;
}

export interface BadgeProgressOut {
  code: string;
  name: string;
  description?: string;
  iconUrl?: string;
  category: string;
  tier?: string | null;
  isAwarded: boolean;
  awardedAt?: string;
  progress: number;
  currentValue: number;
  threshold: number;
}

export interface NotificationOut {
  id: string;
  kind: string;
  title: string;
  body?: string;
  meta?: Record<string, any>;
  readAt?: string;
  createdAt: string;
}

export interface CommentOut {
  id: string;
  postId: string;
  userId: string;
  parentId?: string | null;
  authorName?: string;
  authorAvatar?: string;
  contentText: string;
  replyCount: number;
  createdAt: string;
}

export interface NotificationPreferenceOut {
  likes: boolean;
  comments: boolean;
  followers: boolean;
  mentions: boolean;
  challenges: boolean;
  events: boolean;
}

export interface FeedItem {
  type: 'post' | 'blog' | 'event' | 'challenge';
  id: string;
  data: UserPostOut | Record<string, any>;
  createdAt: string;
}

export interface BlockedUserOut {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export interface MentionOut {
  id: string;
  mentionerId: string;
  mentionerName: string;
  mentionerAvatar: string | null;
  contentType: 'post' | 'comment';
  contentId: string;
  contentPreview: string | null;
  createdAt: string;
}
