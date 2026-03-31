// app/community/post/[postId].tsx
// Single post view — navigated from notification tap / deep link
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  Share,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "@/components/ui/HeaderButton";
import FeedPost from "@/features/community/components/FeedPost";
import CommentSheet from "@/features/community/components/CommentSheet";
import { communityApi } from "@/features/community/api";
import { mapRawPost, toFeedPost } from "@/features/community/utils";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useUserStore } from "@/store/useUserStore";
import useLogsStore from "@/store/useLogsStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import type { FeedPost as FeedPostType } from "@/types/community";

export default function SinglePostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { toggleLike, toggleSave, deletePost } = useCommunityStore();
  const currentUserId = useUserStore((s) => s.user?.id);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Post",
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, router]);

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

  const isOwn = !!currentUserId && post?.user?.id === currentUserId;

  const submitReport = useCallback(async (id: string, reason: string) => {
    try {
      await communityApi.report("post", id, reason);
      Alert.alert("Report Submitted", "Thank you for your feedback.");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Alert.alert("Already Reported", "You have already reported this.");
      } else {
        Alert.alert("Report Failed");
      }
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      ) : (
        <FeedPost
          post={post}
          isOwn={isOwn}
          isVisible
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
          onShare={async () => {
            try { await Share.share({ message: "Check out this post on ClimMate!" }); } catch {}
          }}
          onEdit={isOwn ? () => {
            const mediaUrls = (post.media || []).map((m) => m.url).filter(Boolean);
            router.push({
              pathname: "/community/create",
              params: {
                postId: post.id,
                editContent: post.content || "",
                editMedia: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
                editVisibility: "public",
              },
            });
          } : undefined}
          onDelete={isOwn ? () => {
            Alert.alert("Delete Post", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  deletePost(post.id);
                  router.back();
                },
              },
            ]);
          } : undefined}
          onReport={!isOwn ? () => {
            Alert.alert("Select Report Reason", undefined, [
              { text: "Spam", onPress: () => submitReport(post.id, "spam") },
              { text: "Harassment", onPress: () => submitReport(post.id, "harassment") },
              { text: "Inappropriate", onPress: () => submitReport(post.id, "inappropriate") },
              { text: "Other", onPress: () => submitReport(post.id, "other") },
              { text: "Cancel", style: "cancel" },
            ]);
          } : undefined}
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 120 },
    errorText: { fontSize: 14, color: colors.textTertiary, fontFamily: theme.fonts.regular },
  });
