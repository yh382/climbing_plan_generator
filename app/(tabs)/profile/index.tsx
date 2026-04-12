import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Share, useWindowDimensions } from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedScrollHandler } from "react-native-reanimated";
import PagerView from "react-native-pager-view";
import * as Clipboard from 'expo-clipboard';
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
// Native tab bar height constant (UITabBarController default)
const NATIVE_TAB_BAR_HEIGHT = 49;
import { api } from "../../../src/lib/apiClient";

import PostsSection from "../../../src/features/profile/components/fivecorefunction/PostsSection";
import BadgesSection from "../../../src/features/profile/components/fivecorefunction/BadgesSection";
import StatsSection from "../../../src/features/profile/components/StatsSection";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import useLogsStore from "../../../src/store/useLogsStore";
import { calculateKPIs } from "../../../src/services/stats";

import ProfileHeader from "../../../src/components/shared/ProfileHeader";
import ProfileTabBar from "../../../src/components/shared/ProfileTabBar";

const TABS = ["posts", "stats", "badges"] as const;

type Units = "imperial" | "metric";
type FollowCounts = { followers: number; following: number };

type UserMe = {
  id: string;
  email: string;
  username?: string | null;
  display_name?: string | null;
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

export default function ProfileScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string; initialTab?: string; expandBody?: string }>();

  const viewedUserId = typeof params.userId === "string" ? params.userId : undefined;
  const isOwnProfile = !viewedUserId;


  const profile = useProfileStore((s) => s.profile);
  const headerVM = useProfileStore((s) => s.headerVM);
  const fetchMeProfile = useProfileStore((s) => s.fetchMe);

  const insets = useSafeAreaInsets();
  const tabBarHeight = NATIVE_TAB_BAR_HEIGHT;
  const scrollBottomPadding = Math.max(insets.bottom, 0) + tabBarHeight + 12;

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
  const { logs, sessions: logSessions, syncFromBackend, isSyncing } = useLogsStore();

  // Sync sessions/logs from backend on focus (throttled 30s, same as Calendar)
  const lastSyncRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!isSyncing && now - lastSyncRef.current > 30_000) {
        lastSyncRef.current = now;
        syncFromBackend();
      }
    }, [isSyncing, syncFromBackend])
  );
  const kpis = useMemo(() => calculateKPIs(logs, logSessions), [logs, logSessions]);

  // --------------------- view model ---------------------
  const user: HeaderViewModel = useMemo(() => {
    const username = (me?.username ?? "").trim();
    const fallbackName = me?.email ?? "Profile";
    const displayName = (me?.display_name ?? "").trim() || username || fallbackName;

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
  const [expandBody, setExpandBody] = useState(false);

  // React to navigation params
  useEffect(() => {
    if (params.initialTab === "stats" || params.initialTab === "badges") {
      setActiveTab(params.initialTab);
      const idx = TABS.indexOf(params.initialTab);
      pagerRef.current?.setPage(idx);
    }
    if (params.expandBody === "true") {
      setExpandBody(true);
    }
  }, [params.initialTab, params.expandBody]);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const gradeDisplay = `${user.stats.boulderGrade}/${user.stats.routeGrade}`;

  // --------------------- pager (swipe tabs) ---------------------
  const pagerRef = useRef<PagerView>(null);
  const { height: screenHeight } = useWindowDimensions();

  // Shared value driven by PagerView onPageScroll for smooth tab indicator animation
  const tabScrollPosition = useSharedValue(
    TABS.indexOf((params.initialTab as (typeof TABS)[number]) || "posts"),
  );

  // Track content height per tab page so PagerView grows to fit
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const activePageIndex = TABS.indexOf(activeTab as (typeof TABS)[number]);
  const pagerHeight = Math.max(
    pageHeights[activePageIndex] ?? 0,
    screenHeight * 0.6
  );

  const handlePageLayout = useCallback((pageIndex: number) => (e: { nativeEvent: { layout: { height: number } } }) => {
    const h = e.nativeEvent.layout.height;
    setPageHeights((prev) => {
      if (Math.abs((prev[pageIndex] ?? 0) - h) < 2) return prev;
      return { ...prev, [pageIndex]: h };
    });
  }, []);

  const handleTabPress = useCallback((tab: string) => {
    const idx = TABS.indexOf(tab as (typeof TABS)[number]);
    if (idx >= 0) pagerRef.current?.setPage(idx);
  }, []);

  const onPageScroll = useCallback((e: { nativeEvent: { position: number; offset: number } }) => {
    tabScrollPosition.value = e.nativeEvent.position + e.nativeEvent.offset;
  }, []);

  // Buffer the selected page index — only commit to activeTab when pager is fully idle
  const pendingPageRef = useRef<number | null>(null);

  const onPageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    pendingPageRef.current = e.nativeEvent.position;
  }, []);

  const onPageScrollStateChanged = useCallback((e: { nativeEvent: { pageScrollState: string } }) => {
    if (e.nativeEvent.pageScrollState === "idle" && pendingPageRef.current !== null) {
      const tab = TABS[pendingPageRef.current];
      if (tab) setActiveTab(tab);
      pendingPageRef.current = null;
    }
  }, []);

  // --------------------- render ---------------------
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
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
          headerTitleAnimStyle={{}}
          scrollY={scrollY}
        />

        {/* [1] Tab bar (sticky) */}
        <ProfileTabBar activeTab={activeTab} onTabPress={handleTabPress} scrollPosition={tabScrollPosition} />

        <PagerView
          ref={pagerRef}
          style={{ height: pagerHeight }}
          initialPage={TABS.indexOf((params.initialTab as (typeof TABS)[number]) || "posts")}
          onPageScroll={onPageScroll}
          onPageSelected={onPageSelected}
          onPageScrollStateChanged={onPageScrollStateChanged}
          overdrag
        >
          <View key="posts" style={styles.contentArea}>
            <View onLayout={handlePageLayout(0)}>
              <PostsSection />
            </View>
          </View>
          <View key="stats" style={styles.contentArea}>
            <View onLayout={handlePageLayout(1)}>
              {headerVM ? <StatsSection user={headerVM} styles={styles} initialExpandBody={expandBody} scrollRef={scrollRef as any} /> : null}
            </View>
          </View>
          <View key="badges" style={styles.contentArea}>
            <View onLayout={handlePageLayout(2)}>
              <BadgesSection styles={styles} />
            </View>
          </View>
        </PagerView>
      </Animated.ScrollView>

      {/* Native toolbar: settings + share menu */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="gearshape"
          onPress={() => router.push("/settings")}
        />
        <Stack.Toolbar.Menu icon="square.and.arrow.up">
          <Stack.Toolbar.MenuAction
            icon="link"
            onPress={async () => {
              const url = `https://climmate.app/u/${user.username}`;
              await Clipboard.setStringAsync(url);
            }}
          >
            Copy Link
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={async () => {
              const url = `https://climmate.app/u/${user.username}`;
              await Share.share({
                message: `Check out ${user.username}'s climbing profile on climMate! ${url}`,
                url,
              });
            }}
          >
            Share via...
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="qrcode"
            onPress={() => router.push('/profile/qr-code')}
          >
            QR Code
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  contentArea: { minHeight: 300, backgroundColor: colors.background },

  basicInfoContainer: { padding: 16, backgroundColor: colors.background },
  analysisCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: theme.spacing.cardPadding,
    borderRadius: theme.borderRadius.cardSmall,
    marginBottom: 12,
  },
  analysisText: { fontSize: 14, fontWeight: "600", fontFamily: theme.fonts.medium, marginLeft: 8, color: colors.textPrimary },
  radarCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
    borderRadius: theme.borderRadius.cardSmall,
    marginBottom: 12,
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", fontFamily: theme.fonts.bold, color: colors.textPrimary },
  radarPlaceholder: { width: 200, height: 180, justifyContent: "center", alignItems: "center", marginTop: 10, position: "relative" },

  bodyMetricsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: colors.backgroundSecondary, padding: 12, borderRadius: theme.borderRadius.cardSmall, alignItems: "center", marginHorizontal: 4 },
  metricLabel: { fontSize: theme.typography.label.fontSize, fontFamily: theme.fonts.regular, color: colors.textTertiary, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: "bold", fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  metricUnit: { fontSize: 12, fontWeight: "normal", fontFamily: theme.fonts.regular, color: colors.textSecondary },

  statCard: { backgroundColor: colors.backgroundSecondary, padding: 16, borderRadius: theme.borderRadius.cardSmall, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  statKey: { color: colors.textSecondary, fontSize: 14, fontFamily: theme.fonts.regular },
  statVal: { fontWeight: "600", fontSize: 14, fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border },

  ascentsContainer: { padding: 16 },
  toggleContainer: { flexDirection: "row", backgroundColor: colors.backgroundSecondary, borderRadius: 8, padding: 2, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  toggleBtnActive: { backgroundColor: colors.background },
  toggleText: { fontSize: 13, fontFamily: theme.fonts.medium, color: colors.textSecondary },
  toggleTextActive: { color: colors.textPrimary, fontWeight: "600", fontFamily: theme.fonts.bold },

  logStatsRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  logItem: { alignItems: "center" },
  logVal: { fontSize: 20, fontWeight: "bold", fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  logLabel: { fontSize: 12, fontFamily: theme.fonts.regular, color: colors.textSecondary },

  badgesContainer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
});
