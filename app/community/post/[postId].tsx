// app/community/post/[postId].tsx
// Single post view — navigated from notification tap / deep link
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Text,
  Share,
  Alert,
} from "react-native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import useLogsStore from "@/store/useLogsStore";
import { HeaderButton } from "@/components/ui/HeaderButton";
import FeedPost from "@/features/community/components/FeedPost";
import CommentSheet from "@/features/community/components/CommentSheet";
import EditCaptionSheet from "@/features/community/components/EditCaptionSheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { communityApi } from "@/features/community/api";
import { mapRawPost, toFeedPost } from "@/features/community/utils";
import { useCommunityStore } from "@/store/useCommunityStore";
import { useUserStore } from "@/store/useUserStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import type { FeedPost as FeedPostType } from "@/types/community";
export default function SinglePostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { toggleLike, toggleSave, deletePost, updatePost } = useCommunityStore();
  const editCaptionSheetRef = useRef<TrueSheet>(null);
  const [editingDraft, setEditingDraft] = useState<string>("");
  const currentUserId = useUserStore((s) => s.user?.id);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Post",
      headerTransparent: HEADER_TRANSPARENT,
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
            setEditingDraft(post.content || "");
            editCaptionSheetRef.current?.present();
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
              let userId = att.userId;
              let date = att.date;
              if ((!userId || !date) && isOwn && currentUserId) {
                const localSession = useLogsStore.getState().sessions.find(
                  (s) => s.serverId === att.id,
                );
                if (localSession) {
                  userId = currentUserId;
                  date = localSession.date;
                }
              }
              if (!userId || !date) return;
              router.push({
                pathname: "/daily-summary",
                params: { userId, date },
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
      {post && (
        <EditCaptionSheet
          sheetRef={editCaptionSheetRef}
          postId={post.id}
          initialContent={editingDraft}
          onSave={async (id, content) => {
            await updatePost(id, { content_text: content });
            setPost((p) => (p ? { ...p, content } : p));
          }}
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
