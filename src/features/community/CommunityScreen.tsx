// src/features/community/CommunityScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming, // ✅ 加这个
} from "react-native-reanimated";
import { ChallengesTab } from "./challenges";
import FeedPost from "./components/FeedPost";
import SmartBottomSheet from "./components/SmartBottomSheet";
import { useCommunityStore } from "../../store/useCommunityStore";
import { EventsTab } from "./events";
import { GlassView } from "expo-glass-effect";
type TopTab = "Post" | "Challenges" | "Events";
type PostFilter = "all" | "shared_plan" | "workout_record" | "nearby";

const SCROLL_THRESHOLD = 40;

const FILTER_OPTIONS: Array<{ key: Exclude<PostFilter, "all">; label: string }> = [
  { key: "shared_plan", label: "shared plan" },
  { key: "workout_record", label: "workout record" },
  { key: "nearby", label: "nearby" },
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { posts, toggleLike } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [topTab, setTopTab] = useState<TopTab>("Post");

    // --- top tabs underline animation ---
  const tabLayoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});
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

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PostFilter>("all");
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

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

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return posts.filter((p: any) => {
      // ✅ 修复：UserProfile 没有 name 字段，所以不要用 p.user.name
      const textHay = `${p?.content ?? ""} ${p?.user?.username ?? ""}`.toLowerCase();
      const matchSearch = keyword.length === 0 ? true : textHay.includes(keyword);

      const attType = p?.attachment?.type;
      const matchFilter =
        filter === "all"
          ? true
          : filter === "shared_plan"
            ? attType === "shared_plan"
            : filter === "workout_record"
              ? attType === "workout_record"
              : filter === "nearby"
                ? true
                : true;

      return matchSearch && matchFilter;
    });
  }, [posts, search, filter]);

    const listData = useMemo(() => {
    if (topTab === "Post") return filteredPosts;
    return []; // ✅ Challenges / Events 用 Footer 渲染内容，不走列表 items
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

    {/* Post / Challenges / Events */}
    <View style={{ paddingHorizontal: 16 }}>
    <View style={styles.topTabsWrap}>
        <View style={styles.topTabsRow}>
        {(["Post", "Challenges", "Events"] as TopTab[]).map((t) => {
            const active = topTab === t;
            return (
            <TouchableOpacity
                key={t}
                style={styles.topTabItem}
                onPress={() => setTopTab(t)}
                activeOpacity={0.8}
                onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                tabLayoutsRef.current[t] = { x, width };

                // 初始化 underline（首次布局完成后）
                if (t === topTab) {
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
        </View>

        {/* ✅ 一个“独立”的滑动 underline（绝对定位在 row 底部） */}
        <Animated.View style={[styles.topTabsUnderline, underlineStyle]} />
    </View>
    </View>



      {/* Post-only: search + filter */}
      {topTab === "Post" ? (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>

          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterSheetVisible(true)}>
            <Ionicons name="options-outline" size={20} color="#111" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ height: 10 }} />
      )}
    </View>
  );

  const renderItem = ({ item }: any) => {
    if (item?.__type === "nav") {
      const isChallenges = topTab === "Challenges";
      return (
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push(isChallenges ? "/community/challenges" : "/community/activities")}
          activeOpacity={0.85}
        >
          <View style={styles.navIcon}>
            <Ionicons name={isChallenges ? "trophy-outline" : "calendar-outline"} size={22} color="#111" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.navTitle}>{item.title}</Text>
            <Text style={styles.navSub}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      );
    }

    return (
      <FeedPost
        post={item}
        onLike={(id: string) => toggleLike(id)}
        onPress={() => router.push(`/community/u/${item.user.id}`)}
        onPressComment={() => router.push("/community/notifications")}
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
          <View style={{ width: 80 }} />

          <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
            <Text style={styles.headerTitleText}>Community</Text>
          </Animated.View>

          <View style={styles.headerRightRow}>            
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/community/notifications")}>
              <Ionicons name="notifications" size={26} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/community/create")}>
              <Ionicons name="add-circle" size={30} color="#111" />
            </TouchableOpacity>


          </View>
        </View>
      </View>

    <Animated.FlatList
    data={listData as any[]}
    keyExtractor={(item: any) => item.id}
    renderItem={renderItem}
    ListHeaderComponent={ListHeader}
    ListFooterComponent={
        topTab === "Challenges" ? (
        <ChallengesTab
            onPressViewAllActive={() => {
            // 先占位：以后你要做“View all”次级页就 router.push
            // router.push("/community/challenges");
            }}
            onPressChallenge={(item) => {
              router.push({
                pathname: "/community/challenges/[challengeId]",
                params: {
                  challengeId: item.id,
                  payload: JSON.stringify(item),
                },
              });
            }}


        />
        ) : topTab === "Events" ? (
              <EventsTab
                onPressViewAllMine={() => {
                  // v1 先空着：以后你要做 /community/events 的次级页
                  // router.push("/community/events");
                }}
                onPressEvent={(item) => {
                  router.push({
                    pathname: "/community/events/[eventId]",
                    params: { eventId: item.id },
                  });

                }}
              />
            ) : null

    }
    onScroll={scrollHandler}
    scrollEventThrottle={16}
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    contentContainerStyle={{ paddingBottom: 110 }}
    />


      {/* Filter Bottom Sheet */}
      <SmartBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        mode="list"
        title="Filter"
      >
        <View style={{ padding: 16, paddingBottom: 24 }}>
          <TouchableOpacity
            style={styles.filterRow}
            onPress={() => {
              setFilter("all");
              setFilterSheetVisible(false);
            }}
          >
            <Text style={styles.filterLabel}>All</Text>
            {filter === "all" ? <Ionicons name="checkmark" size={18} color="#111" /> : null}
          </TouchableOpacity>

          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.filterRow}
              onPress={() => {
                setFilter(opt.key);
                setFilterSheetVisible(false);
              }}
            >
              <Text style={styles.filterLabel}>{opt.label}</Text>
              {filter === opt.key ? <Ionicons name="checkmark" size={18} color="#111" /> : null}
            </TouchableOpacity>
          ))}
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


  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111" },
  filterBtn: { width: 44, height: 40, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },

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

  navCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  navIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  navTitle: { fontSize: 15, fontWeight: "800", color: "#111" },
  navSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
