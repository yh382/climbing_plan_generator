// src/features/community/CommunityScreen.tsx
import React, { useCallback, useEffect, useLayoutEffect, useRef, useMemo, useState } from "react";
import { View, Text, Image, FlatList, StyleSheet, RefreshControl, ActivityIndicator, Alert, Share, ViewToken, LayoutAnimation, Platform, UIManager, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFocusEffect, useNavigation, useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { communityApi } from "./api";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { withHeaderTheme } from "@/lib/nativeHeaderOptions";
import FeedPost from "./components/FeedPost";
import { NativeSegmentedControl } from "@/components/ui";
import CommentSheet from "./components/CommentSheet";
import EditCaptionSheet from "./components/EditCaptionSheet";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
// SmartBottomSheet removed — replaced by inline popover
import { useCommunityStore } from "../../store/useCommunityStore";
import { useUserStore } from "../../store/useUserStore";
import useLogsStore from "../../store/useLogsStore";
import useActiveWorkoutStore from "../../store/useActiveWorkoutStore";
import { useChatStore } from "../../store/useChatStore";
import GymsTab from "./gyms/GymsTab";
import ScrollToTopFab from "./components/ScrollToTopFab";
import { setBlockVideoTaps } from "@/components/shared/MediaCarousel";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Mode = "feed" | "gyms";

export default function CommunityScreen() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { posts, toggleLike, toggleSave, fetchFeed, feedLoading, feedMode, setFeedMode, deletePost, updatePost } = useCommunityStore();
  const currentUserId = useUserStore((s) => s.user?.id);
  const { totalUnread, startUnreadPolling, stopUnreadPolling } = useChatStore();

  // Upload progress UI is driven by the global Live Activity surface
  // (uploadActivityBridge). KAYA: post creation now happens implicitly via
  // auto-share when a climb log includes video — no compose flow on this screen.

  const [refreshing, setRefreshing] = useState(false);

  // Scroll-to-top: binds the active tab icon's "tap again" gesture to the
  // Feed FlatList (iOS standard behaviour via useScrollToTop) and powers the
  // floating ↑ button that appears past SCROLL_TO_TOP_THRESHOLD.
  const feedListRef = useRef<FlatList>(null);
  useScrollToTop(feedListRef);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const SCROLL_TO_TOP_THRESHOLD = 600;
  const handleFeedScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      setShowScrollTop(y > SCROLL_TO_TOP_THRESHOLD);
    },
    [],
  );
  const scrollToTop = useCallback(() => {
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // When the global FloatingActiveSessionTimer is visible (active log session
  // and/or minimised workout), lift the scroll-to-top FAB above it so they
  // don't overlap at bottom-right.
  const activeLogSession = useLogsStore((s) => s.activeSession);
  const workoutActive = useActiveWorkoutStore((s) => s.isActive);
  const workoutMinimized = useActiveWorkoutStore((s) => s.isMinimized);
  const floatingPillVisible =
    !!activeLogSession || (workoutActive && workoutMinimized);
  const submitPostReport = useCallback(async (postId: string, reason: string) => {
    try {
      await communityApi.report("post", postId, reason);
      Alert.alert("Report Submitted", "Thank you for your feedback. We will review it shortly.");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Alert.alert("Already Reported", "You have already reported this.");
      } else {
        Alert.alert("Report Failed");
      }
    }
  }, []);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentPostOwnerId, setCommentPostOwnerId] = useState<string | undefined>(undefined);
  const [commentPostCount, setCommentPostCount] = useState<number | undefined>(undefined);
  // Chat unread polling — drives the global chat badge (consumed elsewhere).
  // Notification unread polling moved to home toolbar's inbox icon.
  useFocusEffect(
    useCallback(() => {
      startUnreadPolling();
      return () => {
        stopUnreadPolling();
      };
    }, [startUnreadPolling, stopUnreadPolling]),
  );

  // Fetch feed on mount
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Prefetch video thumbnails so covers are cached before user scrolls to them
  useEffect(() => {
    posts.forEach((post) => {
      post.media?.forEach((m) => {
        if (m.type === "video" && m.thumbUrl) {
          Image.prefetch(m.thumbUrl);
        }
      });
    });
  }, [posts]);

  const [mode, setMode] = useState<Mode>("feed");
  const routeParams = useLocalSearchParams<{ tab?: string; gymId?: string }>();

  // Auto-switch to Gyms mode when navigated with tab=gyms param
  useEffect(() => {
    if (routeParams.tab === 'gyms') {
      setMode('gyms');
    }
  }, [routeParams.tab]);

  // Native iOS header (empty title — the segmented control lives in the
  // Stack.Toolbar below so it shares the UIBarButtonItem baseline with the
  // "+" button. headerTitle's titleView slot uses a different baseline than
  // bar button items, which produced a visible vertical drift.).
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTitle: "",
    });
  }, [navigation, colors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed(true);
    setRefreshing(false);
  };

  const feedListData = useMemo(() => posts, [posts]);


  // PillTabs moved into navigation.setOptions headerTitle (above); no in-list
  // header needed — FlatList's top edge meets the iOS nav bar directly.
  const feedListHeader = null;

  // Visibility tracking — only ONE post plays at a time (the most visible one)
  // Clear active post when leaving Community tab → pauses all videos
  const [activePostId, setActivePostId] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      return () => setActivePostId(null); // cleanup on blur
    }, [])
  );
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // First viewable item is the most visible — only that one plays
      const topId = viewableItems[0]?.item?.id ?? null;
      setActivePostId(topId);
    }
  ).current;
  const feedViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
  }).current;

  const editCaptionSheetRef = useRef<TrueSheet>(null);
  const [editingPost, setEditingPost] = useState<{ id: string; content: string } | null>(null);

  const renderItem = useCallback(({ item }: any) => {
    return (
      <FeedPost
        post={item}
        isVisible={activePostId === item.id}
        onLike={(id: string) => toggleLike(id)}
        onPress={() => router.push(`/community/u/${item.user.id}`)}
        onPressComment={(id: string) => {
          setCommentPostId(id);
          setCommentPostOwnerId(item.user?.id);
          setCommentPostCount(item.comments);
        }}
        onSave={(id: string) => toggleSave(id)}
        isOwn={!!currentUserId && item.user?.id === currentUserId}
        onShare={async () => {
          setBlockVideoTaps(true);
          try { await Share.share({ message: 'Check out this post on ClimMate!' }); } catch {}
          setBlockVideoTaps(false);
        }}
        onEdit={() => {
          setEditingPost({ id: item.id, content: item.content || '' });
          editCaptionSheetRef.current?.present();
        }}
        onDelete={() => {
          Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deletePost(item.id) },
          ]);
        }}
        onReport={() => {
          Alert.alert("Select Report Reason", undefined, [
            { text: "Spam", onPress: () => submitPostReport(item.id, "spam") },
            { text: "Harassment", onPress: () => submitPostReport(item.id, "harassment") },
            { text: "Inappropriate", onPress: () => submitPostReport(item.id, "inappropriate") },
            { text: "Other", onPress: () => submitPostReport(item.id, "other") },
            { text: "Cancel", style: "cancel" },
          ]);
        }}
        onPressAttachment={(post: any) => {
          const att = post?.attachment;
          if (!att?.id) return;

          if (att.type === "plan") {
            router.push({
              pathname: "/community/public-plan",
              params: { planId: att.id },
            });
            return;
          }

          // Route log / session — unified to daily-summary (Window AY).
          // Self vs other rendering is handled inside daily-summary by
          // comparing the userId param to the current user. Own posts
          // fall back to the local session row when the backend hasn't
          // yet enriched attachment_meta with user_id/date (legacy posts).
          if (att.type === "log" || att.type === "session") {
            let userId = att.userId;
            let date = att.date;
            if ((!userId || !date) && item.user?.id === currentUserId && currentUserId) {
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
            return;
          }
        }}
      />
    );
  }, [currentUserId, router, toggleLike, toggleSave, deletePost, submitPostReport, activePostId]);

  const gymsListFooter = useMemo(() => (
    <GymsTab initialGymId={routeParams.tab === 'gyms' ? routeParams.gymId : undefined} />
  ), [routeParams.tab, routeParams.gymId]);

  const feedListEmpty = useMemo(() => (
    <View style={{ padding: 40, alignItems: "center" }}>
      {feedLoading ? (
        <ActivityIndicator size="small" color={colors.textPrimary} />
      ) : (
        <Text style={{ color: colors.textTertiary, fontSize: 14, fontFamily: theme.fonts.regular }}>{tr("还没有帖子，下拉刷新", "No posts yet. Pull to refresh.")}</Text>
      )}
    </View>
  ), [feedLoading, colors, tr]);

  return (
    <>
      {/* BH — For You / Following NativeSegmentedControl rides the
          UIBarButtonItem baseline (same as the "+" button) via
          Stack.Toolbar.View. `hidesSharedBackground` removes the UIKit
          shared bar-button glass chrome — without it, iOS 26's
          `headerTransparent + scrollEdgeEffects: { top: 'soft' }` floating
          Liquid Glass look gets replaced by a solid bar-button backdrop. */}
      {mode === "feed" ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.View hidesSharedBackground>
            <NativeSegmentedControl
              options={[tr("推荐", "For You"), tr("关注", "Following")]}
              selectedIndex={feedMode === "all" ? 0 : 1}
              onSelect={(i) => setFeedMode(i === 0 ? "all" : "following")}
              style={{ width: 200, height: 44 }}
            />
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}

      {/* BF — Strava-mode compose entry: native toolbar "+" button.
          rank → home RankCard；inbox → home toolbar；compose → /community/create. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          onPress={() => router.push('/community/create' as any)}
        />
      </Stack.Toolbar>

      {/* Feed FlatList (mode === "gyms" 时隐藏) */}
      <FlatList
        ref={feedListRef}
        style={[
          { flex: 1, backgroundColor: colors.background },
          mode === "gyms" && ({ display: "none" } as const),
        ]}
        data={feedListData as any[]}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={feedListHeader}
        ListEmptyComponent={feedListEmpty}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={16}
        onScroll={handleFeedScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        onViewableItemsChanged={onViewableItemsChangedRef}
        viewabilityConfig={feedViewabilityConfig}
      />
      {/* Scroll-to-top FAB — only while browsing the Post feed.
          Elevated when the global active-session / workout pill is visible
          so the two don't stack on top of each other. */}
      <ScrollToTopFab
        visible={mode === "feed" && showScrollTop}
        onPress={scrollToTop}
        elevated={floatingPillVisible}
      />

      {/* Gyms FlatList (mode === "feed" 时隐藏) */}
      <FlatList
        style={[
          { flex: 1, backgroundColor: colors.background },
          mode === "feed" && ({ display: "none" } as const),
        ]}
        data={[]}
        keyExtractor={() => "gyms-empty"}
        renderItem={() => null}
        ListFooterComponent={gymsListFooter}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      />

      {/* CommentSheet 外提为全局兄弟节点 */}
      <CommentSheet
        visible={!!commentPostId}
        onClose={() => { setCommentPostId(null); setCommentPostOwnerId(undefined); setCommentPostCount(undefined); }}
        postId={commentPostId ?? ''}
        postOwnerId={commentPostOwnerId}
        commentCount={commentPostCount}
      />

      <EditCaptionSheet
        sheetRef={editCaptionSheetRef}
        postId={editingPost?.id ?? null}
        initialContent={editingPost?.content ?? ''}
        onSave={async (id, content) => {
          await updatePost(id, { content_text: content });
        }}
      />

    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  feedScopeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
  },
  modePillText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },

  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  chatBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  chatBadgeText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    lineHeight: 12,
  },
});
