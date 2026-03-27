// src/features/community/CommunityScreen.tsx
import React, { useCallback, useEffect, useLayoutEffect, useRef, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Share } from "react-native";
import { useFocusEffect, useNavigation, useRouter, useLocalSearchParams, Stack } from "expo-router";
import { communityApi } from "./api";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import FeedPost from "./components/FeedPost";
import { NativeSegmentedControl } from "@/components/ui";
import CommentSheet from "./components/CommentSheet";
// SmartBottomSheet removed — replaced by inline popover
import { useCommunityStore } from "../../store/useCommunityStore";
import { useUserStore } from "../../store/useUserStore";
import useLogsStore from "../../store/useLogsStore";
import { useChatStore } from "../../store/useChatStore";
import { RankTab } from "./rank";
import GymsTab from "./gyms/GymsTab";
import EventsTab from "./events/EventsTab";

type TopTab = "Post" | "Rank" | "Gyms" | "Events";

export default function CommunityScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { posts, toggleLike, toggleSave, fetchFeed, feedLoading, feedMode, setFeedMode, feedSort, setFeedSort, deletePost } = useCommunityStore();
  const currentUserId = useUserStore((s) => s.user?.id);
  const { totalUnread, startUnreadPolling, stopUnreadPolling } = useChatStore();

  const [refreshing, setRefreshing] = useState(false);
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
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await communityApi.getUnreadCount();
      setUnreadNotifCount(res.count ?? 0);
    } catch {
      // silently ignore
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    pollIntervalRef.current = setInterval(fetchUnreadCount, 30000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchUnreadCount]);

  // Chat unread polling
  useEffect(() => {
    startUnreadPolling();
    return () => stopUnreadPolling();
  }, [startUnreadPolling, stopUnreadPolling]);

  // Refresh count when tab regains focus (e.g. returning from notifications)
  useFocusEffect(
    useCallback(() => {
      fetchUnreadCount();
    }, [fetchUnreadCount])
  );

  // Fetch feed on mount
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);
  const [topTab, setTopTab] = useState<TopTab>("Post");
  const routeParams = useLocalSearchParams<{ tab?: string; gymId?: string }>();

  // Auto-switch to Gyms tab when navigated with tab=gyms param
  useEffect(() => {
    if (routeParams.tab === 'gyms') {
      setTopTab('Gyms');
    }
  }, [routeParams.tab]);

  const TOP_TABS: TopTab[] = ["Post", "Rank", "Gyms", "Events"];


  // Native iOS large-title header
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: "Community",
    });
  }, [navigation, colors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed(true);
    setRefreshing(false);
  };

    const listData = useMemo(() => {
    if (topTab === "Post") return posts;
    return []; // Rank / Gyms use Footer rendering, not list items
    }, [topTab, posts]);


  // Memoize header to prevent @expo/ui SwiftUI Host components (NativeSegmentedControl)
  // from being remounted when unrelated state changes (e.g. commentPostId for CommentSheet)
  const listHeader = useMemo(() => (
    <View>
    {/* Post / Rank / Gyms / Events — native segmented control */}
    <View style={{ paddingHorizontal: theme.spacing.screenPadding }}>
      <View style={styles.topTabsWrap}>
          <NativeSegmentedControl
            options={TOP_TABS}
            selectedIndex={TOP_TABS.indexOf(topTab)}
            onSelect={(i) => setTopTab(TOP_TABS[i])}
            style={{ height: 32 }}
          />
      </View>

    {/* Feed scope — only when Post tab is active */}
    {topTab === "Post" && (
      <View style={styles.feedScopeRow}>
        <NativeSegmentedControl
          options={["All", "Following"]}
          selectedIndex={feedMode === "all" ? 0 : 1}
          onSelect={(i) => setFeedMode(i === 0 ? "all" : "following")}
          style={{ width: 180, height: 28 }}
        />

        {/* Sort toggle — only in "All" mode (kept as pills — has icons) */}
        {feedMode === "all" && (
          <View style={styles.sortToggle}>
            <TouchableOpacity
              style={[styles.sortPill, feedSort === "hot" && styles.sortPillActive]}
              onPress={() => setFeedSort("hot")}
              activeOpacity={0.8}
            >
              <Ionicons name="flame" size={14} color={feedSort === "hot" ? "#fff" : colors.textSecondary} />
              <Text style={feedSort === "hot" ? styles.sortTextActive : styles.sortText}>Hot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPill, feedSort === "latest" && styles.sortPillActive]}
              onPress={() => setFeedSort("latest")}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={14} color={feedSort === "latest" ? "#fff" : colors.textSecondary} />
              <Text style={feedSort === "latest" ? styles.sortTextActive : styles.sortText}>Latest</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )}
    </View>

    </View>
  ), [topTab, feedMode, feedSort, colors, styles]);

  const renderItem = useCallback(({ item }: any) => {
    return (
      <FeedPost
        post={item}
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
          try { await Share.share({ message: 'Check out this post on ClimMate!' }); } catch {}
        }}
        onEdit={() => {
          const mediaUrls = (item.images || []) as string[];
          router.push({
            pathname: "/community/create",
            params: {
              postId: item.id,
              editContent: item.content || "",
              editMedia: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
              editVisibility: "public",
            },
          });
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

          // Route log / session
          if (att.type === "log" || att.type === "session") {
            // If own post, navigate to local log-detail (has full local data)
            const isOwn = item.user?.id === currentUserId;
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
            return;
          }
        }}
      />
    );
  }, [currentUserId, router, toggleLike, toggleSave, deletePost, submitPostReport]);

  const listFooter = useMemo(() => {
    const tabContent = topTab === "Events" ? <EventsTab />
      : topTab === "Rank" ? (
          <RankTab onPressUser={(userId) => router.push(`/community/u/${userId}`)} />
        )
      : topTab === "Gyms" ? (
          <GymsTab initialGymId={routeParams.tab === 'gyms' ? routeParams.gymId : undefined} />
        )
      : null;
    return (
      <>
        {tabContent}
        <CommentSheet
          visible={!!commentPostId}
          onClose={() => { setCommentPostId(null); setCommentPostOwnerId(undefined); setCommentPostCount(undefined); }}
          postId={commentPostId ?? ''}
          postOwnerId={commentPostOwnerId}
          commentCount={commentPostCount}
        />
      </>
    );
  }, [topTab, routeParams.tab, routeParams.gymId, router, commentPostId, commentPostOwnerId, commentPostCount]);

  const listEmpty = useMemo(() => {
    if (topTab !== "Post") return null;
    return (
      <View style={{ padding: 40, alignItems: "center" }}>
        {feedLoading ? (
          <ActivityIndicator size="small" color={colors.textPrimary} />
        ) : (
          <Text style={{ color: colors.textTertiary, fontSize: 14, fontFamily: theme.fonts.regular }}>No posts yet. Pull to refresh.</Text>
        )}
      </View>
    );
  }, [topTab, feedLoading, colors]);

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="plus" onPress={() => router.push("/community/create")} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="paperplane" onPress={() => router.push("/chat" as any)}>
          {totalUnread > 0 && (
            <Stack.Toolbar.Badge>{totalUnread > 99 ? '99+' : String(totalUnread)}</Stack.Toolbar.Badge>
          )}
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button
          icon="bell"
          onPress={() => { setUnreadNotifCount(0); router.push("/community/notifications"); }}
        >
          {unreadNotifCount > 0 && <Stack.Toolbar.Badge>{' '}</Stack.Toolbar.Badge>}
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button icon="magnifyingglass" onPress={() => router.push("/search" as any)} />
      </Stack.Toolbar>
      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={listData as any[]}
        keyExtractor={(item: any) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={listEmpty}
      />
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  topTabsWrap: {
    marginBottom: 8,
  },

  feedScopeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  sortToggle: {
    flexDirection: "row",
    marginLeft: "auto",
    gap: 4,
  },
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  sortPillActive: {
    backgroundColor: colors.cardDark,
  },
  sortText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  sortTextActive: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: "#FFF",
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
