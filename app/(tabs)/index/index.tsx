// app/(tabs)/index/index.tsx

import { useEffect, useLayoutEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useSidebar } from "@/contexts/SidebarContext";
import { challengeApi } from "@/features/community/challenges/api";
import type { ChallengeOut } from "@/features/community/challenges/types";
import { getChallengeStatus } from "@/features/community/challenges/types";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useAuthStore } from "@/store/useAuthStore";
import { HomeBlogBannerCarousel, type HomeBlogBannerItem } from "@/features/home/components/HomeBlogBannerCarousel";
import { MOCK_BLOGS } from "@/features/home/blog/component/mockBlogs";
import useLogsStore from "@/store/useLogsStore";
import { getGradeScore } from "../../../src/services/stats/gradeAnalyzer";
import { gradeToScore, scoreToGrade } from "@/lib/gradeSystem";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import SetupClimmateCard from "@/features/home/components/SetupClimmateCard";

// Derive banner data from blog source (auto-updates when blogs change)
const BLOG_BANNERS: HomeBlogBannerItem[] = MOCK_BLOGS.slice(0, 3).map((blog) => ({
  id: blog.id,
  title: blog.title,
  subtitle: "Read now →",
  imageUri: blog.coverImageUri ?? null,
  action: { type: "blog" as const, blogId: blog.id },
}));

// --- Helper: get 1st of current month as YYYY-MM-DD ---
function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMonthEnd(monthStart: string): string {
  const [y, m] = monthStart.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

// --- This Month Snapshot ---
function ThisMonthSnapshot() {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { boulderScale, ropeScale } = useSettings();
  const monthStart = useMemo(getMonthStart, []);
  const monthEnd = useMemo(() => getMonthEnd(monthStart), [monthStart]);

  const { sessions } = useLogsStore();

  const stats = useMemo(() => {
    const monthSessions = sessions.filter((se) => se.date >= monthStart && se.date < monthEnd);
    const totalSends = monthSessions.reduce((sum, se) => sum + se.sends, 0);

    // Find best boulder and best route separately
    let boulderBest = "";
    let boulderBestScore = -1;
    let routeBest = "";
    let routeBestScore = -1;

    for (const se of monthSessions) {
      if (!se.best || se.best === "—" || se.best === "V?") continue;
      const score = getGradeScore(se.best, se.discipline);
      if (se.discipline === "boulder") {
        if (score > boulderBestScore) { boulderBestScore = score; boulderBest = se.best; }
      } else {
        if (score > routeBestScore) { routeBestScore = score; routeBest = se.best; }
      }
    }

    // Convert to user's preferred grade scale
    let boulderDisplay = "";
    if (boulderBest) {
      if (boulderScale === "Font") {
        try {
          const score = gradeToScore(boulderBest, "vscale");
          boulderDisplay = scoreToGrade(score, "font");
        } catch { boulderDisplay = boulderBest; }
      } else {
        boulderDisplay = boulderBest;
      }
    }

    let routeDisplay = "";
    if (routeBest) {
      if (ropeScale === "French") {
        try {
          const score = gradeToScore(routeBest, "yds");
          routeDisplay = scoreToGrade(score, "french");
        } catch { routeDisplay = routeBest; }
      } else {
        routeDisplay = routeBest;
      }
    }

    return {
      sessions: monthSessions.length,
      sends: totalSends,
      boulderBest: boulderDisplay,
      routeBest: routeDisplay,
    };
  }, [sessions, monthStart, monthEnd, boulderScale, ropeScale]);

  const bestDisplay = [stats.boulderBest, stats.routeBest].filter(Boolean).join(" / ") || "—";

  return (
    <View style={s.snapshotSection}>
      <View style={s.snapshotRow}>
        <View style={s.snapshotCard}>
          <Text style={s.snapshotLabel}>Sessions</Text>
          <Text style={s.snapshotValue}>{stats.sessions}</Text>
          <Text style={s.snapshotCaption}>this mo</Text>
        </View>
        <View style={s.snapshotCard}>
          <Text style={s.snapshotLabel}>Sends</Text>
          <Text style={s.snapshotValue}>{stats.sends}</Text>
          <Text style={s.snapshotCaption}>this mo</Text>
        </View>
        <View style={s.snapshotCard}>
          <Text style={s.snapshotLabel}>Best</Text>
          <Text style={[s.snapshotValue, bestDisplay.length > 5 && { fontSize: 16 }]}>{bestDisplay}</Text>
          <Text style={s.snapshotCaption}>this mo</Text>
        </View>
      </View>
      <TouchableOpacity
        style={s.snapshotLink}
        onPress={() => router.push("/calendar")}
        hitSlop={8}
      >
        <Text style={s.snapshotLinkText}>This month →</Text>
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
  const router = useRouter();
  const navigation = useNavigation();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [featuredChallenges, setFeaturedChallenges] = useState<ChallengeOut[]>([]);

  const { toggleSidebar } = useSidebar();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: "Hi, Climber",
    });
  }, [navigation, colors]);

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

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="line.3.horizontal" onPress={toggleSidebar} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="map" onPress={() => router.push("/gyms")} />
        <Stack.Toolbar.Button icon="magnifyingglass" onPress={() => router.push("/search" as any)} />
      </Stack.Toolbar>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
      >
        <StatusBar style="auto" />

      {/* Subtitle (below native large title) */}
      <Text style={s.subtitleText}>Ready to send today?</Text>

      {/* Setup Climmate */}
        <SetupClimmateCard />

        {/* This Month Snapshot */}
        <ThisMonthSnapshot />

        {/* Blog — Banner Carousel */}
        <View style={{ marginBottom: theme.spacing.sectionGap }}>
          <View style={[s.sectionHeaderRow, { paddingHorizontal: theme.spacing.screenPadding, marginBottom: 12 }]}>
            <Text style={s.sectionTitle}>Blog</Text>
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
    </ScrollView>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  // Subtitle below native large title
  subtitleText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    paddingHorizontal: theme.spacing.screenPadding,
    marginBottom: theme.spacing.sectionGap,
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
