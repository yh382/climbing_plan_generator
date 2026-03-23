import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { communityApi } from '../api';
import { useCommunityStore } from '../../../store/useCommunityStore';
import { useUserStore } from '../../../store/useUserStore';
import type { CommentOut } from '../types';
import CommentItem from './CommentItem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [showModal, setShowModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentOut | null>(null);
  const inputRef = useRef<TextInput>(null);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const isPostOwner = !!currentUserId && !!postOwnerId &&
    currentUserId.toLowerCase().trim() === postOwnerId.toLowerCase().trim();

  // Animation: match SmartBottomSheet pattern
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else if (showModal) {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  // Load comments when sheet opens
  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
    if (!visible) {
      setComments([]);
      setText('');
      setReplyingTo(null);
    }
  }, [visible, postId]);

  const animateClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

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
        // Reply: increment parent's replyCount in local state
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId ? { ...c, replyCount: c.replyCount + 1 } : c
          )
        );
      } else {
        // Top-level comment: add to list
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
    // Find the comment to determine if it's top-level or a reply
    const comment = comments.find((c) => c.id === commentId);
    if (comment) {
      // Top-level comment: remove from list and adjust count (1 + its replies)
      const adjustment = -(1 + comment.replyCount);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      updateCommentCount(postId, adjustment);
    } else {
      // It's a reply deleted from within CommentItem — just adjust by -1
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
    // Placeholder: report comment
    if (__DEV__) console.log('Report comment:', commentId);
    Alert.alert('Reported', 'This comment has been reported.');
  }, []);

  const handleReply = useCallback((comment: CommentOut) => {
    setReplyingTo(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handlePressUser = (userId: string) => {
    animateClose();
    setTimeout(() => router.push(`/community/u/${userId}`), 300);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  if (!showModal) return null;

  return (
    <Modal transparent visible={showModal} onRequestClose={animateClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop — appears immediately */}
        <Pressable style={styles.backdrop} onPress={animateClose} />

        {/* Sheet — slides up with spring animation */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          {/* Stop backdrop press from propagating */}
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            {/* Drag bar */}
            <View style={styles.dragBar} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Comments ({commentCount ?? comments.length})</Text>
            </View>

            {/* Comment list */}
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#111" />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
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
                style={{ flex: 1 }}
                contentContainerStyle={comments.length === 0 ? { flex: 1, paddingBottom: 80 } : { paddingBottom: 80 }}
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Floating input area */}
            <View style={styles.floatingInput}>
              {/* Replying indicator */}
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

              {/* Input bar */}
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
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!text.trim() || sending}
                  style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={text.trim() ? '#FFF' : colors.textTertiary} />
                  ) : (
                    <Ionicons name="send" size={16} color={text.trim() ? '#FFF' : colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.6,
    overflow: 'hidden',
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: theme.fonts.black,
    letterSpacing: -0.5,
    color: colors.textPrimary,
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
  floatingInput: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
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
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
});
