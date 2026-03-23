// src/features/community/utils.ts
// Shared helpers for mapping backend post data → UI types

import { FeedPost } from '../../types/community';
import { sanitizeImageUrl } from '../../lib/imageUtils';
import type { UserPostOut } from './types';

/** Map raw backend snake_case response → camelCase UserPostOut */
export function mapRawPost(d: any): UserPostOut {
  // If already camelCase (e.g. from fetchFeed which maps manually), pass through
  if (d.userId || d.contentText !== undefined) return d as UserPostOut;
  return {
    id: d.id,
    userId: d.user_id,
    authorName: d.author_name,
    authorAvatar: sanitizeImageUrl(d.author_avatar) ?? undefined,
    contentText: d.content_text,
    media: d.media,
    attachmentType: d.attachment_type,
    attachmentId: d.attachment_id,
    attachmentMeta: d.attachment_meta,
    visibility: d.visibility || 'public',
    likeCount: d.like_count ?? 0,
    commentCount: d.comment_count ?? 0,
    isLiked: d.is_liked ?? false,
    isSaved: d.is_saved ?? false,
    createdAt: d.created_at,
    gymId: d.gym_id,
    gymName: d.gym_name,
  };
}

/** Transform backend UserPostOut → UI FeedPost */
export function toFeedPost(post: UserPostOut): FeedPost {
  return {
    id: post.id,
    user: {
      id: post.userId,
      username: post.authorName || 'Unknown',
      avatar: sanitizeImageUrl(post.authorAvatar) || '',
    },
    timestamp: post.createdAt,
    content: post.contentText || '',
    images: post.media?.filter(m => m.type === 'image').map(m => m.url),
    gymId: post.gymId,
    gymName: post.gymName,
    attachment: post.attachmentType ? {
      type: post.attachmentType as 'plan' | 'session' | 'log',
      id: post.attachmentId || '',
      title: post.attachmentMeta?.title || '',
      subtitle: post.attachmentMeta?.subtitle || '',
      metrics: post.attachmentMeta?.metrics || undefined,
    } : undefined,
    likes: post.likeCount,
    comments: post.commentCount,
    isLiked: post.isLiked,
    isSaved: post.isSaved,
  };
}
