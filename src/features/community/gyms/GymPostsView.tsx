import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { communityApi } from '../api';
import { mapRawPost, toFeedPost } from '../utils';
import { useCommunityStore } from '../../../store/useCommunityStore';
import FeedPost from '../components/FeedPost';
import CommentSheet from '../components/CommentSheet';
import type { FeedPost as FeedPostType } from '../../../types/community';

interface Props {
  gymId: string;
}

export default function GymPostsView({ gymId }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const { toggleLike, toggleSave } = useCommunityStore();

  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Comment sheet state
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | undefined>(undefined);
  const [commentPostCount, setCommentPostCount] = useState<number | undefined>(undefined);

  const fetchPosts = useCallback(async () => {
    try {
      const raw = await communityApi.getGymPosts(gymId);
      const mapped = (raw || []).map((d: any) => toFeedPost(mapRawPost(d)));
      setPosts(mapped);
    } catch (e: any) {
      if (__DEV__) console.warn('GymPostsView fetch error:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [gymId]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = useCallback(async (id: string) => {
    await toggleLike(id);
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.likes + (p.isLiked ? -1 : 1) } : p
    ));
  }, [toggleLike]);

  const handleSave = useCallback(async (id: string) => {
    await toggleSave(id);
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, isSaved: !p.isSaved } : p
    ));
  }, [toggleSave]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="chatbubbles-outline" size={40} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySub}>Be the first to post in this gym community!</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <FeedPost
            post={item}
            onLike={handleLike}
            onPressAttachment={() => {}}
            onPress={(userId) => router.push(`/community/u/${userId}`)}
            onPressComment={(id) => {
              setCommentPostId(id);
              setCommentPostOwnerId(item.user?.id);
              setCommentPostCount(item.comments);
            }}
            onSave={handleSave}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        scrollEnabled={false}
      />
      <CommentSheet
        visible={!!commentPostId}
        onClose={() => { setCommentPostId(null); setCommentPostOwnerId(undefined); setCommentPostCount(undefined); }}
        postId={commentPostId ?? ''}
        postOwnerId={commentPostOwnerId}
        commentCount={commentPostCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  emptyWrap: {
    padding: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: '#374151',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  list: {
    paddingTop: 8,
  },
});
