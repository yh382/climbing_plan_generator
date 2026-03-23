// src/features/community/CommunityScreen.tsx
import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { communityApi } from "./api";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming, // ✅ 加这个
} from "react-native-reanimated";
import FeedPost from "./components/FeedPost";
import PostActionSheet from "./components/PostActionSheet";
import CommentSheet from "./components/CommentSheet";
// SmartBottomSheet removed — replaced by inline popover
import { useCommunityStore } from "../../store/useCommunityStore";
import { useUserStore } from "../../store/useUserStore";
import useLogsStore from "../../store/useLogsStore";
import { useChatStore } from "../../store/useChatStore";
import { RankTab } from "./rank";
import GymsTab from "./gyms/GymsTab";
import EventsTab from "./events/EventsTab";
import { BlurView } from "expo-blur";

type TopTab = "Post" | "Rank" | "Gyms" | "Events";
type PostFilter = "all" | "plan" | "session" | "nearby";
type RankDiscipline = "all" | "boulder" | "rope";

const SCROLL_THRESHOLD = 40;

const POST_FILTERS: Array<{ key: PostFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "plan", label: "Shared Plan" },
  { key: "session", label: "Workout Record" },
  { key: "nearby", label: "Nearby" },
];

const RANK_FILTERS: Array<{ key: RankDiscipline; label: string }> = [
  { key: "all", label: "All" },
  { key: "boulder", label: "Boulder" },
  { key: "rope", label: "Rope" },
];

export default function CommunityScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { posts, toggleLike, toggleSave, fetchFeed, feedLoading, feedMode, setFeedMode, feedSort, setFeedSort, deletePost } = useCommunityStore();
  const currentUserId = useUserStore((s) => s.user?.id);
  const { totalUnread, startUnreadPolling, stopUnreadPolling } = useChatStore();

  const [refreshing, setRefreshing] = useState(false);
  const [actionPost, setActionPost] = useState<any>(null);

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

    // --- top tabs underline animation ---
  const tabLayoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const underlineInitialized = React.useRef(false);
  const underlineX = useSharedValue(0);
  const underlineW = useSharedValue(0);

  const updateUnderline = (tab: TopTab, animate = true) => {
    const layout = tabLayoutsRef.current[tab];
    if (!layout) return;

    const nextX = layout.x;
    const nextW = layout.width;

    if (animate) {
      underlineX.value = withTiming(nextX, { duration: 220 });
      underlineW.value = withTiming(nextW, { duration: 220 });
    } else {
      underlineX.value = nextX;
      underlineW.value = nextW;
    }
  };

  // underline style
  const underlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: underlineX.value }],
    width: underlineW.value,
  }));

    React.useEffect(() => {
    updateUnderline(topTab, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  const [postFilter, setPostFilter] = useState<PostFilter>("all");
  const [rankDiscipline, setRankDiscipline] = useState<RankDiscipline>("all");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [filterPopoverPos, setFilterPopoverPos] = useState({ top: 0, right: 16 });
  const filterBtnRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);

  const handleFilterPress = useCallback(() => {
    if (filterSheetVisible) {
      setFilterSheetVisible(false);
      return;
    }
    filterBtnRef.current?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
      setFilterPopoverPos({ top: y + h + 6, right: 16 });
      setFilterSheetVisible(true);
    });
  }, [filterSheetVisible]);

  // Check if any filter is active for the current tab
  const isFilterActive =
    topTab === "Post" ? postFilter !== "all"
    : topTab === "Rank" ? rankDiscipline !== "all"
    : false;

  // Header animation like Home
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerBlurStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, 1], Extrapolate.CLAMP),
  }));

  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10], [0, 1], Extrapolate.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10],
          [10, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const bigTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.94], Extrapolate.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
    ],
  }));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed(true);
    setRefreshing(false);
  };

  const filteredPosts = useMemo(() => {
    if (postFilter === "all") return posts;
    return posts.filter((p: any) => {
      const attType = p?.attachment?.type;
      return postFilter === "plan"
        ? attType === "plan"
        : postFilter === "session"
          ? attType === "session"
          : true;
    });
  }, [posts, postFilter]);

    const listData = useMemo(() => {
    if (topTab === "Post") return filteredPosts;
    return []; // Rank / Gyms use Footer rendering, not list items
    }, [topTab, filteredPosts]);


  const ListHeader = () => (
    <View style={{ paddingTop: insets.top + 10 }}>
      {/* Big title */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.bigHeaderArea, bigTitleStyle]}>
          <Text style={styles.greeting}>Community</Text>
        </Animated.View>
        <View style={{ width: 80 }} />
      </View>

    {/* Post / Rank / Gyms */}
    <View style={{ paddingHorizontal: theme.spacing.screenPadding }}>
    <View style={styles.topTabsWrap}>
        <View style={styles.topTabsRow}>
        {(["Post", "Rank", "Gyms", "Events"] as TopTab[]).map((t) => {
            const active = topTab === t;
            return (
            <TouchableOpacity
                key={t}
                style={[styles.topTabItem, active && styles.topTabItemActive]}
                onPress={() => setTopTab(t)}
                activeOpacity={0.8}
                onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                tabLayoutsRef.current[t] = { x, width };

                // Only snap on very first mount; after that useEffect handles animation
                if (t === topTab && !underlineInitialized.current) {
                    underlineInitialized.current = true;
                    updateUnderline(t, false);
                }
                }}
            >
                <Text style={[styles.topTabText, active ? styles.topTabTextActive : styles.topTabTextInactive]}>
                {t}
                </Text>
            </TouchableOpacity>
            );
        })}

          {topTab !== "Gyms" && topTab !== "Events" && (
            <TouchableOpacity
              ref={filterBtnRef}
              style={[styles.tabRowFilterBtn, filterSheetVisible && styles.tabRowFilterBtnActive]}
              onPress={handleFilterPress}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={18} color={filterSheetVisible ? "#FFF" : isFilterActive ? colors.textPrimary : colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* sliding underline */}
        <Animated.View style={[styles.topTabsUnderline, underlineStyle]} />
    </View>

    {/* Feed scope pills — only when Post tab is active */}
    {topTab === "Post" && (
      <View style={styles.feedScopeRow}>
        <TouchableOpacity
          style={[styles.feedPill, feedMode === "all" && styles.feedPillActive]}
          onPress={() => setFeedMode("all")}
          activeOpacity={0.8}
        >
          <Text style={[styles.feedPillText, feedMode === "all" && styles.feedPillTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.feedPill, feedMode === "following" && styles.feedPillActive]}
          onPress={() => setFeedMode("following")}
          activeOpacity={0.8}
        >
          <Text style={[styles.feedPillText, feedMode === "following" && styles.feedPillTextActive]}>
            Following
          </Text>
        </TouchableOpacity>

        {/* Sort toggle — only in "All" mode */}
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
  );

  const renderItem = ({ item }: any) => {
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
        onThreeDot={() => setActionPost(item)}
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
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Fixed header (align with Home) */}
      <View style={[styles.fixedHeader, { height: insets.top + 44 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          <View style={styles.headerLeftRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/community/create")}>
              <Ionicons name="add-circle" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
            <Text style={styles.headerTitleText}>Community</Text>
          </Animated.View>

          <View style={styles.headerRightRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/chat" as any)}>
              <View>
                <Ionicons name="chatbubbles-outline" size={24} color={colors.textPrimary} />
                {totalUnread > 0 && (
                  <View style={styles.chatBadge}>
                    <Text style={styles.chatBadgeText}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => { setUnreadNotifCount(0); router.push("/community/notifications"); }}>
              <View>
                <Ionicons name="notifications" size={24} color={colors.textPrimary} />
                {unreadNotifCount > 0 && <View style={styles.badge} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/search" as any)}>
              <Ionicons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

    <Animated.FlatList
    data={listData as any[]}
    keyExtractor={(item: any) => item.id}
    renderItem={renderItem}
    ListHeaderComponent={ListHeader()}
    ListFooterComponent={
        topTab === "Events" ? (
              <EventsTab />
            ) : topTab === "Rank" ? (
              <RankTab
                discipline={rankDiscipline}
                onPressUser={(userId) => {
                  router.push(`/community/u/${userId}`);
                }}
              />
            ) : topTab === "Gyms" ? (
              <GymsTab initialGymId={routeParams.tab === 'gyms' ? routeParams.gymId : undefined} />
            ) : null
    }
    onScroll={scrollHandler}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    contentContainerStyle={{ paddingBottom: 110 }}
    ListEmptyComponent={
      topTab === "Post" ? (
        <View style={{ padding: 40, alignItems: "center" }}>
          {feedLoading ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <Text style={{ color: colors.textTertiary, fontSize: 14, fontFamily: theme.fonts.regular }}>No posts yet. Pull to refresh.</Text>
          )}
        </View>
      ) : null
    }
    />


      <CommentSheet
        visible={!!commentPostId}
        onClose={() => { setCommentPostId(null); setCommentPostOwnerId(undefined); setCommentPostCount(undefined); }}
        postId={commentPostId ?? ''}
        postOwnerId={commentPostOwnerId}
        commentCount={commentPostCount}
      />

      <PostActionSheet
        visible={!!actionPost}
        onClose={() => setActionPost(null)}
        isOwn={!!currentUserId && actionPost?.user?.id === currentUserId}
        onDelete={() => {
          if (actionPost) {
            deletePost(actionPost.id);
            setActionPost(null);
          }
        }}
        onReport={() => {
          if (!actionPost) return;
          const postId = actionPost.id;
          setActionPost(null);
          Alert.alert(
            "Select Report Reason",
            undefined,
            [
              { text: "Spam", onPress: () => submitPostReport(postId, "spam") },
              { text: "Harassment", onPress: () => submitPostReport(postId, "harassment") },
              { text: "Inappropriate", onPress: () => submitPostReport(postId, "inappropriate") },
              { text: "Other", onPress: () => submitPostReport(postId, "other") },
              { text: "Cancel", style: "cancel" },
            ],
          );
        }}
        onEdit={() => {
          if (actionPost) {
            const mediaUrls = (actionPost.images || []) as string[];
            router.push({
              pathname: "/community/create",
              params: {
                postId: actionPost.id,
                editContent: actionPost.content || "",
                editMedia: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : undefined,
                editVisibility: "public",
              },
            });
            setActionPost(null);
          }
        }}
      />

      {/* Filter popover — rendered at root level for correct z-index */}
      {filterSheetVisible && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setFilterSheetVisible(false)}
          />
          <View style={[styles.filterPopover, { top: filterPopoverPos.top, right: filterPopoverPos.right }]}>
            <Text style={styles.popoverGroupTitle}>
              {topTab === "Post" ? "Filter Posts" : "Filter by Discipline"}
            </Text>
            <View style={styles.popoverPillRow}>
              {(topTab === "Post" ? POST_FILTERS : RANK_FILTERS).map((f) => {
                const currentValue = topTab === "Post" ? postFilter : rankDiscipline;
                const active = currentValue === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.popoverPill, active && styles.popoverPillActive]}
                    onPress={() => {
                      if (topTab === "Post") setPostFilter(f.key as PostFilter);
                      else setRankDiscipline(f.key as RankDiscipline);
                      setFilterSheetVisible(false);
                    }}
                  >
                    <Text style={[styles.popoverPillText, active && styles.popoverPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  fixedHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: "absolute", bottom: 0, left: 0, right: 0, height: 1, backgroundColor: colors.border },
  headerContent: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.spacing.screenPadding },
  headerTitleContainer: { position: "absolute", left: 0, right: 0, alignItems: "center", pointerEvents: "none" },
  headerTitleText: { fontSize: 17, fontWeight: "700", fontFamily: theme.fonts.bold, color: colors.textPrimary },
  headerLeftRow: { flexDirection: "row", alignItems: "center", width: 80, marginLeft: -8 },
  headerRightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: theme.spacing.screenPadding, marginBottom: 14 },
  bigHeaderArea: { flex: 1, paddingTop: 35 },
  greeting: { fontSize: 32, fontWeight: "900", fontFamily: theme.fonts.black, color: colors.textPrimary, lineHeight: 38, letterSpacing: -1 },
  subtitle: { fontSize: 15, fontFamily: theme.fonts.regular, color: colors.textSecondary, marginTop: 2 },

  // Top tabs (text-only) with sliding underline
  topTabsWrap: {
    position: "relative",
    paddingBottom: 10,
    marginBottom: 8,
  },
  topTabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 18,
  },
  topTabItem: {
    paddingVertical: 6,
  },
  topTabItemActive: {},
  topTabText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  topTabTextActive: {
    color: colors.textPrimary,
  },
  topTabTextInactive: {
    color: colors.textSecondary,
  },
  topTabsUnderline: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },

  tabRowFilterBtn: {
    marginLeft: "auto",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRowFilterBtnActive: {
    backgroundColor: "#111",
  },

  filterPopover: {
    position: "absolute",
    width: 260,
    zIndex: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  popoverGroupTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  popoverPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  popoverPill: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  popoverPillActive: {
    backgroundColor: "#111827",
  },
  popoverPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  popoverPillTextActive: {
    color: "#FFF",
  },

  feedScopeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  feedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: colors.backgroundSecondary,
  },
  feedPillActive: {
    backgroundColor: colors.cardDark,
  },
  feedPillText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  feedPillTextActive: {
    color: "#FFF",
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
