import React, { useMemo, useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { TrainingPlan } from "../../src/components/plancard";
import { api } from "../../src/lib/apiClient";

import ShareProfileModal from "src/features/profile/components/ShareProfileModal";
import PostsSection from "../../src/features/profile/components/fivecorefunction/PostsSection";
import BasicInfoSection from "../../src/features/profile/components/fivecorefunction/BasicInfoSection";
import AscentsSection from "../../src/features/profile/components/fivecorefunction/AscentsSection";
import PlansSection from "../../src/features/profile/components/fivecorefunction/PlansSection";
import BadgesSection from "../../src/features/profile/components/fivecorefunction/BadgesSection";
import { useProfileStore } from "@/features/profile/store/useProfileStore";

import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
type Units = "imperial" | "metric";
type FollowCounts = { followers: number; following: number };

type UserMe = {
  id: string;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
  units: Units;
  locale?: string | null;

  bio?: string | null;
  location?: string | null;
  home_gym?: string | null;
};

type HeaderViewModel = {
  name: string;
  username: string;
  avatar: string | null;

  bio: string;
  location: string;
  homeGym: string;

  stats: {
    boulderGrade: string;
    routeGrade: string;
    totalSends: number;
  };

  bodyMetrics: {
    height: number | null;
    weight: number | null;
    apeIndex: number | null;
  };

  strengthStats: {
    maxPullUps: number | null;
    weightedPullUp: number | null;
    hangTime: number | null;
  };

  radarData: {
    finger: number;
    power: number;
    core: number;
    flex: number;
    stamina: number;
  };

  logStats: {
    maxBoulder: string;
    maxRoute: string;
    maxFlash: string;
    totalLogged: number;
  };
};

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

// 跟你 home 那套手感一致：标题在这个阈值附近完成“隐->显”切换
const SCROLL_THRESHOLD = 44;

// 主题绿色（你后续如果有 theme token，可替换）
const BRAND_GREEN = "#2BB673"; // 柔和一点的主题绿

const PROFILE_TABS = [
  { key: "posts", icon: "grid-outline", iconActive: "grid" },
  { key: "basic", icon: "body-outline", iconActive: "body" },
  { key: "ascents", icon: "trending-up-outline", iconActive: "trending-up" },
  { key: "plans", icon: "calendar-outline", iconActive: "calendar" },
  { key: "badges", icon: "ribbon-outline", iconActive: "ribbon" },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();

  const viewedUserId = typeof params.userId === "string" ? params.userId : undefined;
  const isOwnProfile = !viewedUserId;
  const isOwner = isOwnProfile;

  const profile = useProfileStore((s) => s.profile);
  const headerVM = useProfileStore((s) => s.headerVM);
  const fetchMeProfile = useProfileStore((s) => s.fetchMe);

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const scrollBottomPadding = Math.max(insets.bottom, 0) + tabBarHeight + 12;

  const [shareOpen, setShareOpen] = useState(false);

  const [me, setMe] = useState<UserMe | null>(null);
  const didInitialLoad = useRef(false);

  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followers: 0,
    following: 0,
  });

  const [myPlans, setMyPlans] = useState<TrainingPlan[]>([]);
  const [otherPlans, setOtherPlans] = useState<TrainingPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingOtherPlans, setLoadingOtherPlans] = useState(false);

  // --------------------- data loads (不改你原逻辑) ---------------------
  const loadMyPlans = useCallback(async () => {
    if (!isOwnProfile) return;
    setLoadingPlans(true);
    try {
      const res = await api.get<TrainingPlan[]>("/plans/me");
      setMyPlans(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn("LOAD MY PLANS ERROR =>", e);
      setMyPlans([]);
    } finally {
      setLoadingPlans(false);
    }
  }, [isOwnProfile]);

  const loadOtherPlans = useCallback(async () => {
    if (isOwnProfile) return;
    if (!viewedUserId) return;

    setLoadingOtherPlans(true);
    try {
      let res: any = null;
      try {
        res = await api.get<TrainingPlan[]>(`/profiles/${viewedUserId}/plans`);
      } catch {
        res = await api.get<TrainingPlan[]>(`/users/${viewedUserId}/plans`);
      }
      setOtherPlans(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn("LOAD OTHER PLANS ERROR =>", e);
      setOtherPlans([]);
    } finally {
      setLoadingOtherPlans(false);
    }
  }, [isOwnProfile, viewedUserId]);

  const patchPlan = async (planId: string, payload: any) => api.patch(`/plans/${planId}`, payload);

  const onManagePlan = (plan: TrainingPlan) => {
    Alert.alert(plan.title, "Manage visibility / archive", [
      {
        text: "Set Public",
        onPress: async () => {
          setMyPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, visibility: "public" } : p)));
          try {
            await patchPlan(plan.id, { visibility: "public" });
            await loadMyPlans();
          } catch (e: any) {
            Alert.alert("Update failed", String(e?.message ?? e));
          }
        },
      },
      {
        text: "Set Private",
        onPress: async () => {
          setMyPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, visibility: "private" } : p)));
          try {
            await patchPlan(plan.id, { visibility: "private" });
            await loadMyPlans();
          } catch (e: any) {
            Alert.alert("Update failed", String(e?.message ?? e));
          }
        },
      },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          setMyPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, status: "completed" } : p)));
          try {
            await patchPlan(plan.id, { status: "completed" });
            await loadMyPlans();
          } catch (e: any) {
            Alert.alert("Update failed", String(e?.message ?? e));
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const loadHeader = useCallback(async () => {
    try {
      const [u] = await Promise.all([api.get<UserMe>("/users/me"), fetchMeProfile()]);
      setMe(u);
      didInitialLoad.current = true;
    } catch (e) {
      console.error("LOAD PROFILE HEADER ERROR =>", e);
    }
  }, [fetchMeProfile]);

  const loadFollowCounts = useCallback(async () => {
    try {
      const res = await api.get<FollowCounts>("/profiles/me/follow_counts");
      setFollowCounts({
        followers: Number(res?.followers ?? 0),
        following: Number(res?.following ?? 0),
      });
    } catch {
      setFollowCounts({ followers: 0, following: 0 });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHeader();
      loadFollowCounts();
      if (isOwnProfile) loadMyPlans();
      else loadOtherPlans();
    }, [loadHeader, loadFollowCounts, isOwnProfile, loadMyPlans, loadOtherPlans])
  );

  // --------------------- view model ---------------------
  const user: HeaderViewModel = useMemo(() => {
    const username = (me?.username ?? "").trim();
    const fallbackName = me?.email ?? "Profile";
    const displayName = username ? username : fallbackName;

    const boulderGrade = profile?.performance?.boulder_grade?.value ?? "—";
    const routeGrade = profile?.performance?.lead_grade?.value ?? "—";

    const height = profile?.anthropometrics?.height ?? null;
    const weight = profile?.anthropometrics?.weight ?? null;
    const apeIndex = profile?.anthropometrics?.ape_index ?? null;

    const maxPullUps = profile?.performance?.pullup_max_reps?.value ?? null;

    const finger = profile?.ability_scores?.finger ?? 50;
    const pull = profile?.ability_scores?.pull ?? 50;
    const core = profile?.ability_scores?.core ?? 50;
    const flex = profile?.ability_scores?.flex ?? 50;
    const sta = profile?.ability_scores?.sta ?? 50;

    const hangTime =
      profile?.performance?.hang_2h_30mm_sec?.value ??
      profile?.performance?.deadhang_2h_sec?.value ??
      null;

    return {
      name: displayName,
      username: username || "user",
      avatar: me?.avatar_url ?? null,

      bio: (me?.bio ?? "").toString(),
      location: (me?.location ?? "").toString(),
      homeGym: (me?.home_gym ?? "").toString(),

      stats: {
        boulderGrade,
        routeGrade,
        totalSends: 0,
      },

      bodyMetrics: { height, weight, apeIndex },

      radarData: {
        finger,
        power: pull,
        core,
        flex,
        stamina: sta,
      },

      strengthStats: {
        maxPullUps,
        weightedPullUp: null,
        hangTime,
      },

      logStats: {
        maxBoulder: "—",
        maxRoute: "—",
        maxFlash: "—",
        totalLogged: 0,
      },
    };
  }, [me, profile]);

  const posts = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => ({
        id: i,
        image: `https://picsum.photos/400/400?random=${i}`,
      })),
    []
  );

  const tabsSelf = useMemo(
    () => [
      { key: "posts", label: "Posts" },
      { key: "basic", label: "Basic Info" },
      { key: "ascents", label: "Ascents" },
      { key: "plans", label: "Plans" },
      { key: "badges", label: "Badges" },
    ],
    []
  );

  const tabsOther = useMemo(
    () => [
      { key: "posts", label: "Posts" },
      { key: "ascents", label: "Ascents" },
      { key: "plans", label: "Plans" },
      { key: "badges", label: "Badges" },
    ],
    []
  );

  const currentTabs = isOwnProfile ? tabsSelf : tabsOther;
  const [activeTab, setActiveTab] = useState<string>(currentTabs[0].key);
  const [ascentType, setAscentType] = useState<"bouldering" | "routes">("bouldering");
  const plansForSection = isOwner ? myPlans : otherPlans;

  // --------------------- Home-like animations ---------------------
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Topbar 白底淡入
  const topbarBgStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    };
  });

  // Topbar 中间标题渐显 + 轻微上移
  const topbarTitleStyle = useAnimatedStyle(() => {
    return {
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
    };
  });

  // header 内的大标题区域：上移 + 缩小 + 渐隐（保留你的需求）
  const headerTitleAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.92], Extrapolate.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
      ],
    };
  });

  // --------------------- render ---------------------
  const renderTopbar = () => {
    return (
      <View style={[styles.fixedHeader, { height: insets.top + 44 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, topbarBgStyle]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]} />
        </Animated.View>

        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          <View style={{ width: 80, alignItems: "flex-start" }}>
            {!isOwnProfile ? (
              <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={24} color="#111" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          <Animated.View style={[styles.headerTitleContainer, topbarTitleStyle]} pointerEvents="none">
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {user.name}
            </Text>
          </Animated.View>

          <View style={styles.headerRightRow}>
            {/* 手稿：myself 右上角 gear + dots；other user 顶部也有 gear + dots（保留样式，不改功能逻辑） */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                // gear 指向你之前的“设置按钮”
                router.push("/settings");
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={22} color="#111" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => {
                // dots：myself 打开 share（你原逻辑）
                // other user：目前保留为同样入口（如果你后续要改为 report/menu，再说）
                setShareOpen(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    const avatarUri = user.avatar;
    const addressText = [user.homeGym, user.location].filter(Boolean).join(" • ");
    const bioText = user.bio?.trim();
    const showAddress = Boolean(addressText);
    const showBio = Boolean(bioText);

    return (
      <View style={styles.headerBlock}>
            {/* ✅ 背景材质层：iOS 玻璃；其他平台 blur 或纯色 */}
        {Platform.OS === "ios" ? (
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
        ) : (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
        )}
        {/* 头像 + username 同行；头像对齐大标题左边 */}
        <View style={[styles.titleRow, !isOwnProfile && styles.titleRowOther]}>
          <Animated.View style={[styles.titleColumn, headerTitleAnimStyle]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarTitle} />
            ) : (
              <View style={[styles.avatarTitle, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color="#9CA3AF" />
              </View>
            )}

            <View style={styles.titleRight}>
              <Text style={styles.bigTitle} numberOfLines={1}>
                {user.name}
              </Text>

              {showAddress ? (
                <View style={styles.addressLine}>
                  <Ionicons name="location-sharp" size={13} color="#6B7280" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {addressText}
                  </Text>
                </View>
              ) : null}

              {showBio ? (
                <Text style={styles.bioInline} numberOfLines={2}>
                  {bioText}
                </Text>
              ) : null}
            </View>
          </Animated.View>
        </View>

        {/* followers/following + Edit/Follow */}
        <View style={styles.followActionRow}>
          <View style={styles.followInline}>
            <View style={styles.followInlineItem}>
              <Text style={styles.followNum}>{followCounts.followers}</Text>
              <Text style={styles.followLabel}>Followers</Text>
            </View>

            <View style={styles.followInlineDivider} />

            <View style={styles.followInlineItem}>
              <Text style={styles.followNum}>{followCounts.following}</Text>
              <Text style={styles.followLabel}>Following</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryGreenBtn}
            onPress={() => {
              // 不改功能：myself 仍然去 edit；other user 仍然 follow（你后续接 follow api 再说）
              if (isOwnProfile) router.push("/profile/edit");
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryGreenText}>{isOwnProfile ? "Edit" : "Follow"}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats card（灰底，可点击进入统计页） */}
        <TouchableOpacity
          style={styles.statsCard}
          activeOpacity={0.85}
          onPress={() => {
            // 仅 UI 导航入口，不改后端/功能逻辑
            router.push("/profile/stats");
          }}
        >
          <View style={styles.statsHeaderRow}>
            <Text style={styles.statsHeaderText}>2026 Stats</Text>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>

          <View style={styles.yearstatsRow}>
            <View style={styles.yearstatItem}>
              <Text style={styles.yearstatVal}>{user.stats.boulderGrade}</Text>
              <Text style={styles.yearstatLabel}>Boulder</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.yearstatItem}>
              <Text style={styles.yearstatVal}>{user.stats.routeGrade}</Text>
              <Text style={styles.yearstatLabel}>Route</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.yearstatItem}>
              <Text style={styles.yearstatVal}>{user.stats.totalSends}</Text>
              <Text style={styles.yearstatLabel}>Sends</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBarStickyWrap}>
      <View style={styles.tabBar}>
        {PROFILE_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setActiveTab(t.key)} activeOpacity={0.7}>
              <Ionicons
                // @ts-ignore
                name={isActive ? t.iconActive : t.icon}
                size={22}
                color={isActive ? "#111827" : "#9CA3AF"}
              />
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {renderTopbar()}

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: scrollBottomPadding,
          backgroundColor: "#FFFFFF",
        }}
      >
        {renderHeader()}
        {renderTabBar()}

        <View style={styles.contentArea}>
          {activeTab === "posts" && <PostsSection posts={posts} styles={styles} />}

          {activeTab === "basic" && headerVM ? <BasicInfoSection user={headerVM} styles={styles} /> : null}

          {activeTab === "ascents" && (
            <AscentsSection user={user} styles={styles} ascentType={ascentType} setAscentType={setAscentType} />
          )}

          {activeTab === "plans" && (
            <PlansSection
              styles={styles}
              isOwner={isOwner}
              plans={plansForSection}
              onManagePlan={isOwner ? onManagePlan : undefined}
            />
          )}

          {activeTab === "badges" && <BadgesSection styles={styles} />}
        </View>
      </Animated.ScrollView>

      <ShareProfileModal visible={shareOpen} onClose={() => setShareOpen(false)} username={user.username} />
    </View>
  );
}

const styles = StyleSheet.create({
  // ---------------- fixed topbar ----------------
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  headerRightRow: {
    width: 80,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  // ---------------- header block ----------------
  headerBlock: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  // 头像+大标题同行（手稿：重心更下）
  titleRow: {
    marginTop: 18,
    marginBottom: 10,
    paddingTop: 10,
  },
  // other user：顶部有 back，占位更明显，所以整体再下移一点
  titleRowOther: {
    marginTop: 26,
  },
  titleRowInner: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  avatarTitle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },

  titleRight: {
    flex: 1,
    paddingTop: 10,
  },
  bigTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    lineHeight: 38,
  },

  addressLine: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  addressText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  bioInline: {
    marginTop: 6,
    fontSize: 14,
    color: "#111827",
    lineHeight: 19,
  },

  // followers/following + edit/follow
  followActionRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  followInline: { flexDirection: "row", alignItems: "center" },
  followInlineItem: { flexDirection: "row", alignItems: "baseline" },
  followNum: { fontSize: 14, fontWeight: "800", marginRight: 4, color: "#111827" },
  followLabel: { fontSize: 12, color: "#6B7280" },
  followInlineDivider: { width: 1, height: 16, backgroundColor: "#E5E7EB", marginHorizontal: 12 },

  primaryGreenBtn: {
    height: 34,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_GREEN,
  },
  primaryGreenText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  // Stats card
  statsCard: {
    marginTop: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statsHeaderText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  yearstatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  yearstatItem: { flex: 1, alignItems: "center" },
  yearstatVal: { fontSize: 18, fontWeight: "800", color: "#111827" },
  yearstatLabel: { marginTop: 2, fontSize: 11, color: "#6B7280" },
  statDivider: { width: 1, height: 20, backgroundColor: "#E5E7EB" },

  // ---------------- Tabs ----------------
  tabBarStickyWrap: {
    backgroundColor: "#FFFFFF",
    zIndex: 20,
    elevation: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  tabBar: { flexDirection: "row", height: 52 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  activeDot: { position: "absolute", bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: "#111827" },

  contentArea: { minHeight: 300, backgroundColor: "#FFFFFF" },

  // Posts grid styles for PostsSection
  postsGrid: { flexDirection: "row", flexWrap: "wrap" },
  gridImageContainer: { width: ITEM_WIDTH, height: ITEM_WIDTH, borderWidth: 0.5, borderColor: "#fff" },
  gridImage: { width: "100%", height: "100%" },

  // keep existing styles for sub sections
  basicInfoContainer: { padding: 16, backgroundColor: "#FFFFFF" },
  analysisCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  analysisText: { fontSize: 14, fontWeight: "600", marginLeft: 8 },
  radarCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "bold" },
  radarPlaceholder: { width: 200, height: 180, justifyContent: "center", alignItems: "center", marginTop: 10, position: "relative" },

  bodyMetricsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: 12, alignItems: "center", marginHorizontal: 4 },
  metricLabel: { fontSize: 10, color: "#999", marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: "bold", color: "#000" },
  metricUnit: { fontSize: 12, fontWeight: "normal", color: "#666" },

  statCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  statKey: { color: "#666", fontSize: 14 },
  statVal: { fontWeight: "600", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#eee" },

  ascentsContainer: { padding: 16 },
  toggleContainer: { flexDirection: "row", backgroundColor: "#f0f0f0", borderRadius: 8, padding: 2, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 13, color: "#666" },
  toggleTextActive: { color: "#000", fontWeight: "600" },

  logStatsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  logItem: { alignItems: "center" },
  logVal: { fontSize: 20, fontWeight: "bold" },
  logLabel: { fontSize: 12, color: "#666" },

  plansContainer: { padding: 16 },
  planCard: { backgroundColor: "#000", borderRadius: 12, padding: 20, marginBottom: 20 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  planTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  planStatus: { color: "#10B981", fontWeight: "bold" },
  planSub: { color: "#ccc", marginBottom: 16 },
  progressBarBg: { height: 6, backgroundColor: "#333", borderRadius: 3 },
  progressBarFill: { height: "100%", backgroundColor: "#fff", borderRadius: 3 },

  badgesContainer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  
  titleColumn: {
  alignItems: "flex-start",
  },

});
