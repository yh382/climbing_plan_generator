// app/(tabs)/index.tsx

import { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { challengeApi } from "@/features/community/challenges/api";
import type { ChallengeOut } from "@/features/community/challenges/types";
import { getChallengeStatus } from "@/features/community/challenges/types";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { useAuthStore } from "@/store/useAuthStore";
import { HomeBlogBannerCarousel, type HomeBlogBannerItem } from "@/features/home/components/HomeBlogBannerCarousel";
import useLogsStore from "@/store/useLogsStore";
import { getMaxGrade } from "../../src/services/stats/gradeAnalyzer";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import SetupClimmateCard from "@/features/home/components/SetupClimmateCard";

// ===== Banner data (mock — can be replaced by backend later) =====
const BLOG_BANNERS: HomeBlogBannerItem[] = [
  {
    id: "finger-care",
    title: "手指养护指南",
    subtitle: "Read now →",
    imageUri: null,
    color: "#EFF6FF",
    action: { type: "blog", blogId: "finger-care-001" },
  },
  {
    id: "warmup",
    title: "10 分钟热身模板",
    subtitle: "Read now →",
    imageUri: null,
    color: "#FFFBEB",
    action: { type: "blog", blogId: "warmup-002" },
  },
];

const SCROLL_THRESHOLD = 40;

// --- Helper: get Monday of current week as YYYY-MM-DD ---
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

// --- This Week Snapshot ---
function ThisWeekSnapshot() {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const weekStart = useMemo(getWeekStart, []);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);

  const { sessions, logs } = useLogsStore();

  const stats = useMemo(() => {
    const weekSessions = sessions.filter((se) => se.date >= weekStart && se.date < weekEnd);
    const weekLogs = logs.filter((l) => l.date >= weekStart && l.date < weekEnd);
    const totalSends = weekLogs.reduce((sum: number, l) => sum + l.count, 0);
    const best = weekLogs.length > 0 ? getMaxGrade(weekLogs, "boulder") || "—" : "—";
    return {
      sessions: weekSessions.length,
      sends: totalSends,
      best,
    };
  }, [sessions, logs, weekStart, weekEnd]);

  return (
    <View style={s.snapshotSection}>
      <View style={s.snapshotRow}>
        <View style={s.snapshotCard}>
          <Text style={s.snapshotLabel}>Sessions</Text>
          <Text style={s.snapshotValue}>{stats.sessions}</Text>
          <Text style={s.snapshotCaption}>this wk</Text>
        </View>
        <View style={s.snapshotCard}>
          <Text style={s.snapshotLabel}>Sends</Text>
          <Text style={s.snapshotValue}>{stats.sends}</Text>
          <Text style={s.snapshotCaption}>this wk</Text>
        </View>
        <View style={s.snapshotCard}>
          <Text style={s.snapshotLabel}>Best</Text>
          <Text style={s.snapshotValue}>{stats.best}</Text>
          <Text style={s.snapshotCaption}>this wk</Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.snapshotLink}
        onPress={() => router.push("/calendar")}
        hitSlop={8}
      >
        <Text style={s.snapshotLinkText}>This week →</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- Challenges: dark skewed cards ---
function ChallengesSection({ challenges }: { challenges: ChallengeOut[] }) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  return (
    <View style={{ marginBottom: theme.spacing.sectionGap }}>
      <View style={[s.sectionHeaderRow, { paddingHorizontal: theme.spacing.screenPadding }]}>
        <Text style={s.sectionTitle}>Challenges</Text>
        <TouchableOpacity onPress={() => router.push("/community/challenges")} hitSlop={8}>
          <Text style={s.ctaText}>View All →</Text>
        </TouchableOpacity>
      </View>
      {challenges.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.screenPadding, gap: theme.spacing.cardGap }}
        >
          {challenges.map((challenge) => (
            <TouchableOpacity
              key={challenge.id}
              style={s.challengeCard}
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/community/challenges/[challengeId]",
                  params: { challengeId: challenge.id, payload: JSON.stringify(challenge) },
                })
              }
            >
              {/* Skewed image area */}
              <View style={s.challengeImageArea}>
                <View style={s.challengeSkew}>
                  <Ionicons name="trophy" size={24} color="rgba(255,255,255,0.5)" />
                </View>
              </View>
              {/* Info */}
              <View style={s.challengeInfo}>
                <Text style={s.challengeName} numberOfLines={2}>
                  {challenge.title}
                </Text>
                <Text style={s.challengeParticipants}>
                  {challenge.participantCount} joined
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Text style={{ paddingHorizontal: theme.spacing.screenPadding, color: colors.textTertiary, fontSize: 13 }}>
          No active challenges
        </Text>
      )}
    </View>
  );
}

// ===== Main Home Screen =====
export default function HomeScreen() {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [featuredChallenges, setFeaturedChallenges] = useState<ChallengeOut[]>([]);

  useEffect(() => {
    bootstrap();
    challengeApi
      .getChallenges({ limit: 20 })
      .then((all) => {
        const active = all.filter((c) => getChallengeStatus(c) === "active").slice(0, 5);
        setFeaturedChallenges(active);
      })
      .catch(() => {});
  }, []);

  // Scroll animation
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
      { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.9], Extrapolate.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      {/* --- Fixed Header --- */}
      <View style={[s.fixedHeader, { height: insets.top + 44 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
          <View style={s.headerBorder} />
        </Animated.View>

        <View style={[s.headerContent, { marginTop: insets.top }]}>
          <View style={{ width: 80 }} />

          <Animated.View style={[s.headerTitleContainer, headerTitleStyle]}>
            <Text style={s.headerTitleText}>Home</Text>
          </Animated.View>

          <View style={s.headerRightRow}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push("/gyms")}>
              <Ionicons name="map" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push("/search" as any)}>
              <Ionicons name="search" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* --- Scrollable Content --- */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={s.headerRow}>
          <Animated.View style={[s.bigHeaderArea, bigTitleStyle]}>
            <Text style={s.greeting}>Hi, Climber</Text>
            <Text style={s.subtitle}>Ready to send today?</Text>
          </Animated.View>
          <View style={{ width: 80 }} />
        </View>

        {/* Setup Climmate */}
        <SetupClimmateCard />

        {/* This Week Snapshot */}
        <ThisWeekSnapshot />

        {/* Read — Blog Banner Carousel */}
        <View style={{ marginBottom: theme.spacing.sectionGap }}>
          <View style={[s.sectionHeaderRow, { paddingHorizontal: theme.spacing.screenPadding, marginBottom: 12 }]}>
            <Text style={s.sectionTitle}>Read</Text>
          </View>
        </View>
        <View style={{ marginTop: -theme.spacing.sectionGap }}>
          <HomeBlogBannerCarousel
            banners={BLOG_BANNERS}
            onPressBlog={(blogId) => {
              router.push({ pathname: "/blog/[blogId]", params: { blogId } });
            }}
            onViewAll={() => {
              router.push("/blog");
            }}
          />
        </View>

        {/* Challenges — dark skewed cards */}
        <ChallengesSection challenges={featuredChallenges} />
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  // Header
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screenPadding,
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Greeting
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.screenPadding,
    marginBottom: theme.spacing.sectionGap,
  },
  bigHeaderArea: { flex: 1, paddingTop: 35 },
  greeting: {
    fontSize: 33,
    fontWeight: "900",
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
    lineHeight: 38,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // This Week Snapshot
  snapshotSection: {
    paddingHorizontal: theme.spacing.screenPadding,
    marginBottom: theme.spacing.sectionGap,
  },
  snapshotRow: {
    flexDirection: "row",
    gap: theme.spacing.cardGap,
  },
  snapshotCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.cardSmall,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: "400",
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  snapshotValue: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: theme.fonts.monoMedium,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  snapshotCaption: {
    fontSize: 10,
    fontWeight: "400",
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
    marginTop: 2,
  },
  snapshotLink: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  snapshotLinkText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },

  // Section shared
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },

  // Challenges — dark skewed cards
  challengeCard: {
    width: 150,
    backgroundColor: colors.cardDark,
    borderRadius: theme.borderRadius.card,
    overflow: "hidden",
  },
  challengeImageArea: {
    height: 80,
    backgroundColor: colors.cardDarkImage,
    overflow: "hidden",
  },
  challengeSkew: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ skewY: "-3deg" }],
  },
  challengeInfo: {
    padding: theme.spacing.cardPadding,
  },
  challengeName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  challengeParticipants: {
    fontSize: 11,
    fontWeight: "400",
    color: "rgba(255,255,255,0.5)",
  },
});
