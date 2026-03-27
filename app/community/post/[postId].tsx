// app/community/post/[postId].tsx
// Single post view — navigated from notification tap
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "../../../src/components/ui/HeaderButton";
import FeedPost from "../../../src/features/community/components/FeedPost";
import CommentSheet from "../../../src/features/community/components/CommentSheet";
import { communityApi } from "../../../src/features/community/api";
import { mapRawPost, toFeedPost } from "../../../src/features/community/utils";
import { useCommunityStore } from "../../../src/store/useCommunityStore";
import { useUserStore } from "../../../src/store/useUserStore";
import useLogsStore from "../../../src/store/useLogsStore";
import { FeedPost as FeedPostType } from "../../../src/types/community";

export default function SinglePostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { toggleLike, toggleSave, updateCommentCount } = useCommunityStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Post",
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, router]);
  const currentUserId = useUserStore((s) => s.user?.id);

  const [post, setPost] = useState<FeedPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentSheetVisible, setCommentSheetVisible] = useState(false);

  useEffect(() => {
    if (!postId) return;
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const raw = await communityApi.getPost(postId as string);
      setPost(toFeedPost(mapRawPost(raw)));
    } catch (e: any) {
      if (__DEV__) console.warn("loadPost error:", e?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#111" />
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      ) : (
        <FeedPost
          post={post}
          onLike={(id) => {
            toggleLike(id);
            setPost((p) => p ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p);
          }}
          onPress={() => router.push(`/community/u/${post.user.id}` as any)}
          onPressComment={() => setCommentSheetVisible(true)}
          onSave={(id) => {
            toggleSave(id);
            setPost((p) => p ? { ...p, isSaved: !p.isSaved } : p);
          }}
          onPressAttachment={(p) => {
            const att = p?.attachment;
            if (!att?.id) return;
            if (att.type === "plan") {
              router.push({
                pathname: "/library/plan-overview",
                params: { planId: att.id, source: "market" },
              });
              return;
            }
            if (att.type === "log" || att.type === "session") {
              const isOwn = post?.user?.id === currentUserId;
              if (isOwn) {
                const localSession = useLogsStore.getState().sessions.find(
                  (s) => s.serverId === att.id
                );
                if (localSession) {
                  router.push({
                    pathname: "/library/log-detail",
                    params: {
                      date: localSession.date,
                      sessionKey: localSession.sessionKey,
                      gymName: localSession.gymName,
                      mode: localSession.discipline,
                      origin: "community",
                    },
                  });
                  return;
                }
              }
              router.push({
                pathname: "/community/public-route-log",
                params: { sessionId: att.id },
              });
            }
          }}
        />
      )}

      {post && (
        <CommentSheet
          visible={commentSheetVisible}
          onClose={() => setCommentSheetVisible(false)}
          postId={postId as string}
          postOwnerId={post.user.id}
          commentCount={post.comments}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: "#9CA3AF" },
});
