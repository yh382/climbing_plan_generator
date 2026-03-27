import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import FeedPost from "../../src/features/community/components/FeedPost";
import CommentSheet from "../../src/features/community/components/CommentSheet";
import { communityApi } from "../../src/features/community/api";
import { mapRawPost, toFeedPost } from "../../src/features/community/utils";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import { FeedPost as FeedPostType } from "../../src/types/community";

export default function SavedPosts() {
  const router = useRouter();
  const { toggleLike, toggleSave } = useCommunityStore();
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | undefined>(undefined);
  const [commentPostCount, setCommentPostCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      const raw = await communityApi.getSavedPosts(0, 50);
      setPosts((raw as any[]).map((r) => toFeedPost(mapRawPost(r))));
    } catch (e: any) {
      if (__DEV__) console.warn('loadSaved error:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#111" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedPost
              post={item}
              onLike={(id: string) => toggleLike(id)}
              onPress={(userId: string) => router.push(`/community/u/${userId}`)}
              onPressComment={(id: string) => {
                setCommentPostId(id);
                setCommentPostOwnerId(item.user?.id);
                setCommentPostCount(item.comments);
              }}
              onSave={(id: string) => toggleSave(id)}
              onPressAttachment={() => {}}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No saved posts yet</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
        />
      )}

      <CommentSheet
        visible={!!commentPostId}
        onClose={() => { setCommentPostId(null); setCommentPostOwnerId(undefined); setCommentPostCount(undefined); }}
        postId={commentPostId ?? ''}
        postOwnerId={commentPostOwnerId}
        commentCount={commentPostCount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: "#9CA3AF" },
});
