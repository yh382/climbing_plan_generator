import React, { useMemo, useState, useCallback, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Native tab bar height constant (UITabBarController default)
const NATIVE_TAB_BAR_HEIGHT = 49;

import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { api } from "../../src/lib/apiClient";

import ShareProfileModal from "src/features/profile/components/ShareProfileModal";
import PostsSection from "../../src/features/profile/components/fivecorefunction/PostsSection";
import BadgesSection from "../../src/features/profile/components/fivecorefunction/BadgesSection";
import StatsSection from "../../src/features/profile/components/StatsSection";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import useLogsStore from "../../src/store/useLogsStore";
import { calculateKPIs } from "../../src/services/stats";

import ProfileTopBar from "../../src/components/shared/ProfileTopBar";
import ProfileHeader from "../../src/components/shared/ProfileHeader";
import ProfileTabBar from "../../src/components/shared/ProfileTabBar";

type Units = "imperial" | "metric";
type FollowCounts = { followers: number; following: number };

type UserMe = {
  id: string;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
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

const SCROLL_THRESHOLD = 44;

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();

  const viewedUserId = typeof params.userId === "string" ? params.userId : undefined;
  const isOwnProfile = !viewedUserId;

  const profile = useProfileStore((s) => s.profile);
  const headerVM = useProfileStore((s) => s.headerVM);
  const fetchMeProfile = useProfileStore((s) => s.fetchMe);

  const insets = useSafeAreaInsets();
  const tabBarHeight = NATIVE_TAB_BAR_HEIGHT;
  const scrollBottomPadding = Math.max(insets.bottom, 0) + tabBarHeight + 12;

  const [shareOpen, setShareOpen] = useState(false);

  const [me, setMe] = useState<UserMe | null>(null);
  const didInitialLoad = useRef(false);

  const [followCounts, setFollowCounts] = useState<FollowCounts>({
    followers: 0,
    following: 0,
  });

  // --------------------- data loads ---------------------
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
    }, [loadHeader, loadFollowCounts])
  );

  // --------------------- log stats from store ---------------------
  const { logs, sessions: logSessions } = useLogsStore();
  const kpis = useMemo(() => calculateKPIs(logs, logSessions), [logs, logSessions]);

  // --------------------- view model ---------------------
  const user: HeaderViewModel = useMemo(() => {
    const username = (me?.username ?? "").trim();
    const fallbackName = me?.email ?? "Profile";
    const displayName = username ? username : fallbackName;

    const boulderGrade = kpis.maxBoulder !== "—"
      ? kpis.maxBoulder
      : profile?.performance?.boulder_grade?.value ?? "—";
    const routeGrade = kpis.maxRope !== "—"
      ? kpis.maxRope
      : profile?.performance?.lead_grade?.value ?? "—";

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
        totalSends: kpis.totalSends,
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
        maxBoulder: kpis.maxBoulder,
        maxRoute: kpis.maxRope,
        maxFlash: kpis.maxFlash || "—",
        totalLogged: kpis.totalSends,
      },
    };
  }, [me, profile, kpis]);

  const [activeTab, setActiveTab] = useState<string>("posts");

  // --------------------- Home-like animations ---------------------
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const topbarBgStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    };
  });

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

  const headerTitleAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.92], Extrapolate.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
      ],
    };
  });

  const gradeDisplay = `${user.stats.boulderGrade}/${user.stats.routeGrade}`;

  // --------------------- render ---------------------
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ProfileTopBar
        title={user.name}
        isOwnProfile={isOwnProfile}
        topbarBgStyle={topbarBgStyle}
        topbarTitleStyle={topbarTitleStyle}
        insetTop={insets.top}
        onBackPress={() => router.back()}
        onSettingsPress={() => router.push("/settings")}
        onMorePress={() => setShareOpen(true)}
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{
          paddingBottom: scrollBottomPadding,
        }}
      >
        {/* [0] Cover/gradient + header — scrolls with content */}
        <ProfileHeader
          name={user.name}
          username={user.username}
          avatarUrl={user.avatar}
          coverUrl={me?.cover_url ?? null}
          bio={user.bio || null}
          location={user.location || null}
          homeGym={user.homeGym || null}
          followersCount={followCounts.followers}
          followingCount={followCounts.following}
          gradeDisplay={gradeDisplay}
          totalSends={user.stats.totalSends}
          isOwnProfile={isOwnProfile}
          onEditPress={() => router.push("/profile/edit")}
          onFollowersPress={() => router.push("/profile/followers" as any)}
          onFollowingPress={() => router.push("/profile/following" as any)}
          headerTitleAnimStyle={headerTitleAnimStyle}
          topPadding={insets.top + 44}
        />

        {/* [1] Tab bar (sticky) */}
        <ProfileTabBar activeTab={activeTab} onTabPress={setActiveTab} />

        <View style={styles.contentArea}>
          {activeTab === "posts" && <PostsSection />}

          {activeTab === "stats" && headerVM ? <StatsSection user={headerVM} styles={styles} /> : null}

          {activeTab === "badges" && <BadgesSection styles={styles} />}
        </View>
      </Animated.ScrollView>

      <ShareProfileModal visible={shareOpen} onClose={() => setShareOpen(false)} username={user.username} />
    </View>
  );
}

const styles = StyleSheet.create({
  contentArea: { minHeight: 300, backgroundColor: "#FFFFFF" },

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

  badgesContainer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
});
