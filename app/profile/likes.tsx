import { useEffect, useState, useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import FeedPost from "../../src/features/community/components/FeedPost";
import CommentSheet from "../../src/features/community/components/CommentSheet";
import { communityApi } from "../../src/features/community/api";
import { mapRawPost, toFeedPost } from "../../src/features/community/utils";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import { FeedPost as FeedPostType } from "../../src/types/community";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useSettings } from "src/contexts/SettingsContext";
import type { ThemeColors } from "../../src/lib/theme";

export default function LikedPosts() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { toggleLike, toggleSave } = useCommunityStore();
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | undefined>(undefined);
  const [commentPostCount, setCommentPostCount] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("点赞", "Likes"),
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, lang]);

  useEffect(() => {
    loadLiked();
  }, []);

  const loadLiked = async () => {
    try {
      const raw = await communityApi.getLikedPosts(0, 50);
      setPosts((raw as any[]).map((r) => toFeedPost(mapRawPost(r))));
    } catch (e: any) {
      if (__DEV__) console.warn('loadLiked error:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
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
              <Text style={styles.emptyText}>{tr("暂无点赞", "No liked posts yet")}</Text>
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
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
