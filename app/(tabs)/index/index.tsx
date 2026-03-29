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

  const { sessions } = useLogsStore();

  const stats = useMemo(() => {
    const weekSessions = sessions.filter((se) => se.date >= weekStart && se.date < weekEnd);
    const totalSends = weekSessions.reduce((sum, se) => sum + se.sends, 0);

    let best = "—";
    let bestScore = -1;
    for (const se of weekSessions) {
      if (se.best && se.best !== "—" && se.best !== "V?") {
        const score = getGradeScore(se.best, se.discipline);
        if (score > bestScore) {
          bestScore = score;
          best = se.best;
        }
      }
    }

    return {
      sessions: weekSessions.length,
      sends: totalSends,
      best,
    };
  }, [sessions, weekStart, weekEnd]);

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

        {/* This Week Snapshot */}
        <ThisWeekSnapshot />

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
