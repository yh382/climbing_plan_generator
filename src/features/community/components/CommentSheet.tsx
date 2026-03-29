import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { communityApi } from '../api';
import { useCommunityStore } from '../../../store/useCommunityStore';
import { useUserStore } from '../../../store/useUserStore';
import type { CommentOut } from '../types';
import CommentItem from './CommentItem';

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  postOwnerId?: string;
  commentCount?: number;
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

export default function CommentSheet({ visible, onClose, postId, postOwnerId, commentCount }: CommentSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const currentUserId = useUserStore((s) => s.user?.id);
  const updateCommentCount = useCommunityStore((s) => s.updateCommentCount);

  const [comments, setComments] = useState<CommentOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentOut | null>(null);
  const inputRef = useRef<any>(null);
  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  const isPostOwner = !!currentUserId && !!postOwnerId &&
    currentUserId.toLowerCase().trim() === postOwnerId.toLowerCase().trim();

  // Present/dismiss based on visible prop
  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    setComments([]);
    setText('');
    setReplyingTo(null);
    onClose();
  }, [onClose]);

  // Load comments when sheet opens
  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const raw = await communityApi.getComments(postId);
      setComments((raw as any[]).map(mapRawComment));
    } catch (e: any) {
      if (__DEV__) console.warn('loadComments error:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const parentId = replyingTo?.id;
      const raw = await communityApi.createComment(postId, trimmed, parentId);
      const newComment = mapRawComment(raw);

      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c
          )
        );
      } else {
        setComments((prev) => [...prev, newComment]);
      }
      updateCommentCount(postId, 1);
      setText('');
      setReplyingTo(null);
    } catch (e: any) {
      if (__DEV__) console.warn('createComment error:', e?.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      const adjustment = -(1 + comment.replyCount);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      updateCommentCount(postId, adjustment);
    } else {
      updateCommentCount(postId, -1);
    }
    try {
      await communityApi.deleteComment(postId, commentId);
    } catch (e: any) {
      if (__DEV__) console.warn('deleteComment error:', e?.message);
      loadComments();
    }
  };

  const handleReport = useCallback((commentId: string) => {
    if (__DEV__) console.log('Report comment:', commentId);
    Alert.alert('Reported', 'This comment has been reported.');
  }, []);

  const handleReply = useCallback((comment: CommentOut) => {
    setReplyingTo(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handlePressUser = (userId: string) => {
    sheetRef.current?.dismiss();
    setTimeout(() => router.push(`/community/u/${userId}`), 300);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const footerElement = (
    <View style={styles.inputArea}>
      {replyingTo && (
        <View style={styles.replyBar}>
          <Text style={styles.replyBarText} numberOfLines={1}>
            Replying to <Text style={styles.replyBarName}>@{replyingTo.authorName || 'User'}</Text>
          </Text>
          <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={replyingTo ? `Reply to @${replyingTo.authorName || 'User'}...` : 'Add a comment...'}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        {text.trim().length > 0 && (
          <TouchableOpacity onPress={handleSubmit} disabled={sending} style={styles.postBtn}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.postBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.4, 0.9]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      dimmedDetentIndex={0}
      onDidDismiss={handleDismiss}
      footer={footerElement}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comments</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item: CommentOut) => item.id}
          renderItem={({ item }: { item: CommentOut }) => (
            <CommentItem
              comment={item}
              isOwnComment={item.userId === currentUserId}
              isPostOwner={isPostOwner}
              postId={postId}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onReport={handleReport}
              onReply={handleReply}
              onPressUser={handlePressUser}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            </View>
          }
          style={styles.commentList}
          contentContainerStyle={comments.length === 0 ? { flexGrow: 1, paddingBottom: 80 } : { paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
  commentList: {
    flex: 1,
  },
  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  replyBarText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  replyBarName: {
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
  },
  postBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    color: colors.accent,
  },
});
