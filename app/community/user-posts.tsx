// app/community/user-posts.tsx
// Vertically scrollable list of a user's posts — navigated from profile post grid.

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  Share,
  Alert,
  ViewToken,
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

export default function UserPostsScreen() {
  const { userId, initialPostId } = useLocalSearchParams<{
    userId: string;
    initialPostId?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const currentUserId = useUserStore((s) => s.user?.id);
  // userId param may be missing when navigating from own profile
  const resolvedUserId = userId || currentUserId;
  const isOwn = !!currentUserId && resolvedUserId === currentUserId;
  const { toggleLike, toggleSave, deletePost } = useCommunityStore();

  // Header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Posts",
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router]);

  // Data
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialIndex, setInitialIndex] = useState<number | undefined>(undefined);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!resolvedUserId) return;
    (async () => {
      setLoading(true);
      try {
        const raw = isOwn
          ? await communityApi.getMyPosts(0, 100)
          : await communityApi.getUserPosts(resolvedUserId, 0, 100);
        const mapped = (raw ?? []).map((d: any) => toFeedPost(mapRawPost(d)));
        setPosts(mapped);
        if (initialPostId) {
          const idx = mapped.findIndex((p) => p.id === initialPostId);
          if (idx >= 0) setInitialIndex(idx);
        }
      } catch (e) {
        if (__DEV__) console.warn("UserPostsScreen load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedUserId, isOwn, initialPostId]);

  // Comment sheet
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | undefined>();
  const [commentPostCount, setCommentPostCount] = useState<number | undefined>();

  // Report
  const submitReport = useCallback(async (postId: string, reason: string) => {
    try {
      await communityApi.report("post", postId, reason);
      Alert.alert("Report Submitted", "Thank you for your feedback.");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Alert.alert("Already Reported", "You have already reported this.");
      } else {
        Alert.alert("Report Failed");
      }
    }
  }, []);

  // Visibility tracking for video auto-play
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(new Set());
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setVisiblePostIds(
        new Set(viewableItems.map((v) => v.item?.id).filter(Boolean))
      );
    }
  ).current;
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  // Scroll-to-index fallback (variable height items)
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: false });
      }, 200);
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPostType }) => (
      <FeedPost
        post={item}
        isVisible={visiblePostIds.has(item.id)}
        onLike={(id) => {
          toggleLike(id);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
                : p
            )
          );
        }}
        onPress={() => router.push(`/community/u/${item.user.id}` as any)}
        onPressComment={(id) => {
          setCommentPostId(id);
          setCommentPostOwnerId(item.user?.id);
          setCommentPostCount(item.comments);
        }}
        onSave={(id) => {
          toggleSave(id);
          setPosts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, isSaved: !p.isSaved } : p))
          );
        }}
        onShare={async () => {
          try {
            await Share.share({ message: "Check out this post on ClimMate!" });
          } catch {}
        }}
        isOwn={!!currentUserId && item.user?.id === currentUserId}
        onEdit={
          currentUserId && item.user?.id === currentUserId
            ? () => {
                const mediaUrls = (item.media || []).map((m: any) => m.url).filter(Boolean);
                router.push({
                  pathname: "/community/create",
                  params: {
                    postId: item.id,
                    editContent: item.content || "",
                    editMedia: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
                    editVisibility: "public",
                  },
                });
              }
            : undefined
        }
        onDelete={
          currentUserId && item.user?.id === currentUserId
            ? () => {
                Alert.alert("Delete Post", "Are you sure?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                      deletePost(item.id);
                      setPosts((prev) => prev.filter((p) => p.id !== item.id));
                    },
                  },
                ]);
              }
            : undefined
        }
        onReport={
          currentUserId && item.user?.id !== currentUserId
            ? () => {
                Alert.alert("Select Report Reason", undefined, [
                  { text: "Spam", onPress: () => submitReport(item.id, "spam") },
                  { text: "Harassment", onPress: () => submitReport(item.id, "harassment") },
                  { text: "Inappropriate", onPress: () => submitReport(item.id, "inappropriate") },
                  { text: "Other", onPress: () => submitReport(item.id, "other") },
                  { text: "Cancel", style: "cancel" },
                ]);
              }
            : undefined
        }
        onPressAttachment={(p) => {
          const att = p?.attachment;
          if (!att?.id) return;
          if (att.type === "plan") {
            router.push({
              pathname: "/community/public-plan",
              params: { planId: att.id },
            });
            return;
          }
          if (att.type === "log" || att.type === "session") {
            const ownPost = item.user?.id === currentUserId;
            if (ownPost) {
              const localSession = useLogsStore
                .getState()
                .sessions.find((s) => s.serverId === att.id);
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
    ),
    [visiblePostIds, currentUserId, router, toggleLike, toggleSave, deletePost, submitReport]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        ref={listRef}
        style={{ flex: 1, backgroundColor: colors.background }}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={onScrollToIndexFailed}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
      <CommentSheet
        visible={!!commentPostId}
        onClose={() => {
          setCommentPostId(null);
          setCommentPostOwnerId(undefined);
          setCommentPostCount(undefined);
        }}
        postId={commentPostId ?? ""}
        postOwnerId={commentPostOwnerId}
        commentCount={commentPostCount}
      />
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
      paddingTop: 120,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textTertiary,
      fontFamily: theme.fonts.regular,
    },
  });
