import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Share, useWindowDimensions, Platform } from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import CollapsingHeaderBg from "@/features/profile/components/CollapsingHeaderBg";
import CollapsingHeaderTitle from "@/features/profile/components/CollapsingHeaderTitle";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import PagerView from "react-native-pager-view";
import * as Clipboard from 'expo-clipboard';
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
// Native tab bar height constant (UITabBarController default)
const NATIVE_TAB_BAR_HEIGHT = 49;
import { api } from "../../../../src/lib/apiClient";

import ActivityFeedSection from "../../../../src/features/profile/components/fivecorefunction/ActivityFeedSection";
import StatsAndBadgesSection from "../../../../src/features/profile/components/fivecorefunction/StatsAndBadgesSection";
import ListsSection from "../../../../src/features/outdoor/components/ListsSection";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import useLogsStore from "../../../../src/store/useLogsStore";
import { calculateKPIs } from "../../../../src/services/stats";

import ProfileHeader from "../../../../src/components/shared/ProfileHeader";
import { PROFILE_TABS, PROFILE_TAB_BAR_HEIGHT } from "../../../../src/components/shared/ProfileTabBar";
import StickyProfileTabBar from "../../../../src/components/shared/StickyProfileTabBar";

const TABS: readonly ["activity", "stats", "lists"] = ["activity", "stats", "lists"];

// iOS 26+ runs the SF Symbols inside a Liquid Glass capsule that adapts
// to the underlying material — light mode wants a dark symbol, dark mode
// wants a light one. Pre-iOS-26 the toolbar sits directly over the cover
// image, so white still gives the best contrast.
const IS_IOS_26 =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

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
  // Toolbar tint adapts to the rendering context — see IS_IOS_26 comment
  // above. iOS<26 keeps white (cover image background); iOS 26 follows the
  // theme primary text color so Liquid Glass stays readable in both modes.
  const toolbarIconColor = IS_IOS_26 ? colors.textPrimary : "#FFFFFF";
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

  // Sync sessions/logs from backend on focus (throttled 2 min to cap DB load —
  // full-sync is heavy; pull-to-refresh elsewhere triggers an immediate sync
  // when the user explicitly wants fresh data).
  const lastSyncRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (!isSyncing && now - lastSyncRef.current > 120_000) {
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

  const [activeTab, setActiveTab] = useState<string>("activity");

  // React to navigation params
  useEffect(() => {
    // Legacy "badges" deep-links collapse onto the stats segment; lists
    // gets its own segment now. BG: legacy "sends" deep-links now route
    // to the renamed "activity" tab so prod links don't break.
    let target: (typeof TABS)[number] | null = null;
    if (params.initialTab === "lists") target = "lists";
    else if (params.initialTab === "stats" || params.initialTab === "badges")
      target = "stats";
    else if (params.initialTab === "activity" || params.initialTab === "sends")
      target = "activity";
    if (target) {
      setActiveTab(target);
      const idx = TABS.indexOf(target);
      pagerRef.current?.setPage(idx);
    }
  }, [params.initialTab]);

  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // BG fix v5 — `StickyProfileTabBar` now lives OUTSIDE the ScrollView
  // as an absolute overlay (Fallback B), so PagerView's native layer
  // can't draw over the bar mid-scroll. The spacer below reserves the
  // bar's vertical slot inside the scroll content; the bar uses
  // `measure(spacerRef)` to mirror that screen position frame-by-frame.
  const spacerRef = useAnimatedRef<Animated.View>();
  // 0 = bar at rest position (CollapsingHeader chrome invisible) → 1 =
  // bar fully pinned (chrome fully opaque). Driven from the bar's
  // worklet via spacer distance to headerHeight.
  const pinFadeProgress = useSharedValue<number>(0);

  // Window BG — Collapsing nav: nav-bar background fades from transparent
  // to opaque colors.background as the user scrolls past the cover (scrollY
  // ~ 0 → 200). Title morphs to a mini-avatar + name row in the same range.
  // Stack.Toolbar on the right (⚙ + share menu) is independent and keeps
  // rendering — verified on device.
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: HEADER_TRANSPARENT,
      // Belt-and-suspenders: also set scrollEdgeEffects here in case
      // setOptions overrides the _layout.tsx value rather than merging
      // (RN/Expo Router behaviour differs across versions).
      scrollEdgeEffects: { top: "hidden" },
      headerBackground: () => (
        <CollapsingHeaderBg pinFadeProgress={pinFadeProgress} />
      ),
      headerTitle: () => (
        <CollapsingHeaderTitle
          pinFadeProgress={pinFadeProgress}
          avatarUrl={user.avatar}
          name={user.name}
        />
      ),
    });
  }, [navigation, pinFadeProgress, user.avatar, user.name]);

  // --------------------- pager (swipe tabs) ---------------------
  const pagerRef = useRef<PagerView>(null);
  const { height: screenHeight } = useWindowDimensions();

  // Shared value driven by PagerView onPageScroll for smooth tab indicator animation
  const tabScrollPosition = useSharedValue(
    Math.max(0, TABS.indexOf("activity" as (typeof TABS)[number])),
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
          homeGym={user.homeGym || null}
          followersCount={followCounts.followers}
          followingCount={followCounts.following}
          viewMode={isOwnProfile ? "self" : "other"}
          onEditPress={() => router.push("/profile/edit")}
          onFollowersPress={() => router.push("/profile/followers" as any)}
          onFollowingPress={() => router.push("/profile/following" as any)}
          scrollY={scrollY}
          gradeText={`${user.stats.boulderGrade}/${user.stats.routeGrade}`}
          totalSends={user.stats.totalSends}
          onKPIPress={() => {
            if (me?.id) router.push(`/users/${me.id}/ascents` as any);
          }}
        />

        {/* Tab bar spacer — reserves the bar's slot in the scroll
            content so PagerView lands beneath the bar's natural
            position. The actual bar is rendered as an absolute overlay
            sibling of the ScrollView (below) and reads this spacer's
            screen position via `measure(spacerRef)`.
            v5.3 — `marginTop: -35` migrated here from the now-removed
            `contentShell`. It overlaps the spacer 35pt up into the
            cover image area (matching original mockup intent) so the
            bar's animated rounded top corners reveal cover behind the
            carve. The spacer itself is transparent. */}
        <Animated.View
          ref={spacerRef}
          style={{
            height: PROFILE_TAB_BAR_HEIGHT,
            marginTop: -35,
          }}
        />

        <PagerView
          ref={pagerRef}
          style={{ height: pagerHeight }}
          initialPage={Math.max(
            0,
            TABS.indexOf(
              ((params.initialTab === "activity" || params.initialTab === "sends")
                ? "activity"
                : params.initialTab === "stats" || params.initialTab === "lists"
                  ? params.initialTab
                  : "activity") as (typeof TABS)[number],
            ),
          )}
          onPageScroll={onPageScroll}
          onPageSelected={onPageSelected}
          onPageScrollStateChanged={onPageScrollStateChanged}
          overdrag
        >
          <View key="activity" style={styles.contentArea}>
            <View onLayout={handlePageLayout(0)}>
              {me?.id ? <ActivityFeedSection userId={me.id} viewMode="self" /> : null}
            </View>
          </View>
          <View key="stats" style={styles.contentArea}>
            <View onLayout={handlePageLayout(1)} style={{ minHeight: screenHeight * 0.6 }}>
              {headerVM ? (
                <StatsAndBadgesSection user={headerVM} parentStyles={styles} />
              ) : null}
            </View>
          </View>
          <View key="lists" style={styles.contentArea}>
            <View onLayout={handlePageLayout(2)} style={{ minHeight: screenHeight * 0.6 }}>
              <ListsSection
                showCreate
                contentPaddingHorizontal={16}
                inScrollView
              />
            </View>
          </View>
        </PagerView>
      </Animated.ScrollView>

      {/* BG fix v5 (Fallback B) — absolute-overlay sticky tab bar,
          rendered as a sibling of the ScrollView so PagerView's native
          layer cannot draw above it during the pin transition. */}
      <StickyProfileTabBar
        scrollY={scrollY}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        scrollPosition={tabScrollPosition}
        spacerRef={spacerRef}
        pinFadeProgress={pinFadeProgress}
      />

      {/* Native toolbar: settings + share menu.
          iOS 26 Liquid Glass renders these inside a translucent capsule;
          black SF Symbols read better against the glass than white.
          iOS<26 keeps the COMPAT-era white tint for legibility against the
          full-bleed cover image background. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="gearshape"
          tintColor={toolbarIconColor}
          onPress={() => router.push("/settings")}
        />
        <Stack.Toolbar.Menu icon="square.and.arrow.up" tintColor={toolbarIconColor}>
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
