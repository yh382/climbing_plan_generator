// src/features/community/CommunityScreen.tsx
import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { communityApi } from "./api";
import { Ionicons } from "@expo/vector-icons";
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
import SmartBottomSheet from "./components/SmartBottomSheet";
import { useCommunityStore } from "../../store/useCommunityStore";
import { useUserStore } from "../../store/useUserStore";
import { useChatStore } from "../../store/useChatStore";
import { RankTab } from "./rank";
import GymsTab from "./gyms/GymsTab";
import { GlassView } from "expo-glass-effect";

type TopTab = "Post" | "Rank" | "Gyms";
type PostFilter = "all" | "shared_plan" | "workout_record" | "nearby";
type RankDiscipline = "all" | "boulder" | "rope";

const SCROLL_THRESHOLD = 40;

const POST_FILTERS: Array<{ key: PostFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "shared_plan", label: "Shared Plan" },
  { key: "workout_record", label: "Workout Record" },
  { key: "nearby", label: "Nearby" },
];

const RANK_FILTERS: Array<{ key: RankDiscipline; label: string }> = [
  { key: "all", label: "All" },
  { key: "boulder", label: "Boulder" },
  { key: "rope", label: "Rope" },
];

export default function CommunityScreen() {
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
      return postFilter === "shared_plan"
        ? attType === "shared_plan"
        : postFilter === "workout_record"
          ? attType === "workout_record"
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
    <View style={{ paddingHorizontal: 16 }}>
    <View style={styles.topTabsWrap}>
        <View style={styles.topTabsRow}>
        {(["Post", "Rank", "Gyms"] as TopTab[]).map((t) => {
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

          {topTab !== "Gyms" && (
            <TouchableOpacity
              style={styles.tabRowFilterBtn}
              onPress={() => setFilterSheetVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={18} color={isFilterActive ? "#111" : "#9CA3AF"} />
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
              <Ionicons name="flame" size={14} color={feedSort === "hot" ? "#fff" : "#6B7280"} />
              <Text style={feedSort === "hot" ? styles.sortTextActive : styles.sortText}>Hot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortPill, feedSort === "latest" && styles.sortPillActive]}
              onPress={() => setFeedSort("latest")}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={14} color={feedSort === "latest" ? "#fff" : "#6B7280"} />
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

          if (att?.type === "shared_plan") {
            router.push({
              pathname: "/library/plan-overview",
              params: { planId: att.id, source: "market" },
            });
            return;
          }

          // ✅ NEW: workout record -> community read-only daily log
          if (att?.type === "workout_record") {
            router.push({
              pathname: "/community/workout-record",
              params: {
                attachment: JSON.stringify(att),
                // 兜底：有些 attachment 可能把 date/gymName 放在顶层
                date: String(att?.date || ""),
                gymName: String(att?.gymName || ""),
              },
            });
            return;
          }
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed header (align with Home) */}
      <View style={[styles.fixedHeader, { height: insets.top + 44 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill}/>
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          <View style={styles.headerLeftRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/community/create")}>
              <Ionicons name="add-circle" size={30} color="#111" />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
            <Text style={styles.headerTitleText}>Community</Text>
          </Animated.View>

          <View style={styles.headerRightRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/chat" as any)}>
              <View>
                <Ionicons name="chatbubbles-outline" size={24} color="#111" />
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
                <Ionicons name="notifications" size={26} color="#111" />
                {unreadNotifCount > 0 && <View style={styles.badge} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/community/search")}>
              <Ionicons name="search" size={24} color="#111" />
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
        topTab === "Rank" ? (
              <RankTab
                discipline={rankDiscipline}
                onPressUser={(userId) => {
                  router.push(`/community/u/${userId}`);
                }}
              />
            ) : topTab === "Gyms" ? (
              <GymsTab />
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
            <ActivityIndicator size="small" color="#111" />
          ) : (
            <Text style={{ color: "#9CA3AF", fontSize: 14 }}>No posts yet. Pull to refresh.</Text>
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

      {/* Unified Filter Bottom Sheet — content changes per active tab */}
      <SmartBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        mode="list"
        title="Filter"
      >
        <View style={{ padding: 16, paddingBottom: 24 }}>
          {(topTab === "Post" ? POST_FILTERS : RANK_FILTERS
          ).map((f: { key: string; label: string }) => {
            const currentValue =
              topTab === "Post" ? postFilter : rankDiscipline;

            const active = currentValue === f.key;

            return (
              <TouchableOpacity
                key={f.key}
                style={styles.filterRow}
                onPress={() => {
                  if (topTab === "Post") setPostFilter(f.key as PostFilter);
                  else setRankDiscipline(f.key as RankDiscipline);
                  setFilterSheetVisible(false);
                }}
              >
                <Text style={styles.filterLabel}>{f.label}</Text>
                {active ? <Ionicons name="checkmark" size={18} color="#111" /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </SmartBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },

  fixedHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: "absolute", bottom: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(0,0,0,0.05)" },
  headerContent: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  headerTitleContainer: { position: "absolute", left: 0, right: 0, alignItems: "center", pointerEvents: "none" },
  headerTitleText: { fontSize: 17, fontWeight: "700", color: "#111" },
  headerLeftRow: { flexDirection: "row", alignItems: "center", width: 80 },
  headerRightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, marginBottom: 14 },
  bigHeaderArea: { flex: 1, paddingTop: 35, },
  greeting: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 2 },

  // Top tabs (text-only) with sliding underline
  topTabsWrap: {
    position: "relative",
    paddingBottom: 10, // 给 underline 留空间
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
  topTabItemActive: {
    transform: [{ scale: 1.1 }],
  },
  topTabText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  topTabTextActive: {
    color: "#111",
    fontWeight: "800",
  },
  topTabTextInactive: {
    color: "#9CA3AF",
    fontWeight: "700",
  },
  topTabsUnderline: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#111",
  },


  tabRowFilterBtn: {
    marginLeft: "auto",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  filterRow: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  filterLabel: { fontSize: 14, fontWeight: "700", color: "#111" },

  feedScopeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  feedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  feedPillActive: {
    backgroundColor: "#111",
  },
  feedPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
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
    backgroundColor: "#F3F4F6",
  },
  sortPillActive: {
    backgroundColor: "#111",
  },
  sortText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  sortTextActive: {
    fontSize: 12,
    fontWeight: "700",
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
    lineHeight: 12,
  },
});
