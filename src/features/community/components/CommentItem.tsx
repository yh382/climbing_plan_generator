import React, { useState, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import type { CommentOut } from '../types';
import { communityApi } from '../api';

interface CommentItemProps {
  comment: CommentOut;
  isOwnComment: boolean;
  isPostOwner: boolean;
  postId: string;
  currentUserId?: string;
  onDelete: (commentId: string) => void;
  onReport: (commentId: string) => void;
  onReply: (comment: CommentOut) => void;
  onPressUser: (userId: string) => void;
}

function mapRawComment(d: any): CommentOut {
  if (d.postId || d.contentText !== undefined) return d as CommentOut;
  return {
    id: d.id,
    postId: d.post_id,
    userId: d.user_id,
    parentId: d.parent_id ?? null,
    authorName: d.author_name,
    authorAvatar: d.author_avatar,
    contentText: d.content_text,
    replyCount: d.reply_count ?? 0,
    createdAt: d.created_at,
  };
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommentItem({
  comment,
  isOwnComment,
  isPostOwner,
  postId,
  currentUserId,
  onDelete,
  onReport,
  onReply,
  onPressUser,
}: CommentItemProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [replies, setReplies] = useState<CommentOut[]>([]);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [localReplyCount, setLocalReplyCount] = useState(comment.replyCount);

  const handlePress = () => {
    if (isOwnComment) {
      Alert.alert(comment.authorName || 'Your Comment', undefined, [
        { text: 'Reply', onPress: () => onReply(comment) },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
      ]);
    } else {
      onReply(comment);
    }
  };

  const handleLongPress = () => {
    if (isOwnComment) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isPostOwner) {
      Alert.alert(comment.authorName || 'Comment', undefined, [
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
        { text: 'Report', onPress: () => onReport(comment.id) },
      ]);
    } else {
      Alert.alert('Report Comment', 'Report this comment as inappropriate?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: () => onReport(comment.id) },
      ]);
    }
  };

  const toggleReplies = async () => {
    if (repliesExpanded) {
      setRepliesExpanded(false);
      return;
    }
    setLoadingReplies(true);
    try {
      const raw = await communityApi.getReplies(postId, comment.id);
      setReplies((raw as any[]).map(mapRawComment));
      setRepliesExpanded(true);
    } catch (e: any) {
      if (__DEV__) console.warn('loadReplies error:', e?.message);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleDeleteReply = (replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setLocalReplyCount((c) => Math.max(0, c - 1));
    onDelete(replyId);
  };

  return (
    <View>
      <Pressable
        style={styles.container}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <TouchableOpacity onPress={() => onPressUser(comment.userId)} activeOpacity={0.7}>
          {comment.authorAvatar ? (
            <Image source={{ uri: comment.authorAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={14} color="#9CA3AF" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => onPressUser(comment.userId)} activeOpacity={0.7}>
              <Text style={styles.authorName}>{comment.authorName || 'User'}</Text>
            </TouchableOpacity>
            <Text style={styles.time}>{timeAgo(comment.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.contentText}</Text>
        </View>
      </Pressable>

      {/* View replies button */}
      {localReplyCount > 0 && (
        <TouchableOpacity style={styles.viewRepliesBtn} onPress={toggleReplies} activeOpacity={0.7}>
          <View style={styles.replyLine} />
          <Text style={styles.viewRepliesText}>
            {loadingReplies
              ? 'Loading...'
              : repliesExpanded
                ? 'Hide replies'
                : `View ${localReplyCount} ${localReplyCount === 1 ? 'reply' : 'replies'}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Nested replies (1 level only) */}
      {repliesExpanded && replies.map((reply) => {
        const isOwnReply = reply.userId === currentUserId;
        return (
          <Pressable
            key={reply.id}
            style={styles.replyContainer}
            onPress={() => {
              if (isOwnReply) {
                Alert.alert(reply.authorName || 'Your Reply', undefined, [
                  { text: 'Reply', onPress: () => onReply(reply) },
                  { text: 'Delete', style: 'destructive', onPress: () => handleDeleteReply(reply.id) },
                ]);
              } else {
                onReply(reply);
              }
            }}
            onLongPress={() => {
              if (isOwnReply) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (isPostOwner) {
                Alert.alert(reply.authorName || 'Reply', undefined, [
                  { text: 'Delete', style: 'destructive', onPress: () => handleDeleteReply(reply.id) },
                  { text: 'Report', onPress: () => onReport(reply.id) },
                ]);
              } else {
                Alert.alert('Report Reply', 'Report this reply as inappropriate?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Report', style: 'destructive', onPress: () => onReport(reply.id) },
                ]);
              }
            }}
            delayLongPress={400}
          >
            <TouchableOpacity onPress={() => onPressUser(reply.userId)} activeOpacity={0.7}>
              {reply.authorAvatar ? (
                <Image source={{ uri: reply.authorAvatar }} style={styles.replyAvatar} />
              ) : (
                <View style={[styles.replyAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={12} color="#9CA3AF" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.body}>
              <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => onPressUser(reply.userId)} activeOpacity={0.7}>
                  <Text style={styles.replyAuthorName}>{reply.authorName || 'User'}</Text>
                </TouchableOpacity>
                <Text style={styles.time}>{timeAgo(reply.createdAt)}</Text>
              </View>
              <Text style={styles.replyText}>{reply.contentText}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  time: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
  },
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 58,
    paddingVertical: 4,
    gap: 8,
  },
  replyLine: {
    width: 24,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  replyContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 58,
    paddingRight: 16,
    gap: 8,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  replyAuthorName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
  },
});
