// app/community/public-plan.tsx
import { useState, useMemo, useLayoutEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

import { usePlanDetail } from "../../src/features/plans/hooks";
import { plansApi } from "../../src/features/plans/api";
import { SessionAccordion } from "../../src/features/plans/components/SessionAccordion";
import { TRAINING_TYPE_GRADIENTS } from "../../src/components/plancard/PlanCard.gradients";
import type { TrainingType } from "../../src/components/plancard/PlanCard.types";
import type { PlanV3Session } from "../../src/types/plan";

import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from "react-native-reanimated";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HERO_HEIGHT = SCREEN_WIDTH * 0.65;

function detectLocale(): "zh" | "en" {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

export default function PublicPlanScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { plan, loading } = usePlanDetail(planId ?? null);

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const locale = useMemo(() => detectLocale(), []);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [added, setAdded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroParallaxStyle = useAnimatedStyle(() => {
    if (scrollY.value >= 0) return {};
    const absScroll = -scrollY.value;
    return {
      transform: [
        { scale: 1 + absScroll / HERO_HEIGHT },
        { translateY: scrollY.value / 2 },
      ],
    };
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerBlurEffect: "systemChromeMaterial",
      title: plan?.title ?? "",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, router, plan]);

  const { totalWeeks, sessionsPerWeek, allSessions } = useMemo(() => {
    if (!plan?.planJson) {
      return { totalWeeks: 0, sessionsPerWeek: 0, allSessions: [] as PlanV3Session[] };
    }
    const pj = plan.planJson;
    const climb = pj.session_bank?.climb_sessions ?? [];
    const train = pj.session_bank?.train_sessions ?? [];
    const all = [...climb, ...train];
    const weeks = plan.durationWeeks ?? pj.meta?.cycle_weeks ?? Math.max(1, Math.ceil(all.length / Math.max(1, (pj.quotas?.climb ?? 0) + (pj.quotas?.train ?? 0))));
    const perWeek = (pj.quotas?.climb ?? 0) + (pj.quotas?.train ?? 0);
    return { totalWeeks: weeks, sessionsPerWeek: perWeek, allSessions: all };
  }, [plan]);

  const currentSessions = useMemo(() => {
    if (sessionsPerWeek <= 0 || allSessions.length === 0) return allSessions;
    const start = (selectedWeek - 1) * sessionsPerWeek;
    return allSessions.slice(start, start + sessionsPerWeek);
  }, [allSessions, sessionsPerWeek, selectedWeek]);

  const weeksArray = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);

  const handleClone = async () => {
    if (!planId) return;
    try {
      await plansApi.clonePlan(planId);
      setAdded(true);
    } catch {
      Alert.alert("Error", "Failed to add plan");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.cardDark} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Plan not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.cardDark, fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUrl = plan.coverImageUrl;
  const gradient = TRAINING_TYPE_GRADIENTS[(plan.trainingType as TrainingType) || "mixed"] ?? TRAINING_TYPE_GRADIENTS.mixed;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <Animated.View style={heroParallaxStyle}>
          <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient colors={["transparent", "#0D0F10"]} style={styles.heroGradient} />
            <View style={styles.heroContent}>
              <Text numberOfLines={2} style={styles.heroTitle}>{plan.title}</Text>
              {plan.authorName ? (
                <Text style={styles.creatorText}>by @{plan.authorName}</Text>
              ) : null}
              <Text style={styles.heroMeta}>
                {totalWeeks} weeks · ~{sessionsPerWeek} sessions/wk
                {plan.trainingType ? ` · ${plan.trainingType}` : ""}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Meta tags */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            {plan.trainingType ? (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>
                  {plan.trainingType.charAt(0).toUpperCase() + plan.trainingType.slice(1)}
                </Text>
              </View>
            ) : null}
            {plan.authorName ? (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>By {plan.authorName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Week Navigator */}
        <View style={styles.navWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navContent}>
            {weeksArray.map((w) => {
              const isActive = w === selectedWeek;
              return (
                <TouchableOpacity
                  key={w}
                  style={[styles.weekCard, isActive && styles.weekCardActive]}
                  onPress={() => setSelectedWeek(w)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.weekNum, isActive && styles.weekNumActive]}>W{w}</Text>
                  <View style={styles.dotsRow}>
                    {Array.from({ length: Math.min(sessionsPerWeek, 5) }).map((_, i) => (
                      <View key={i} style={[styles.dot, isActive && styles.dotActive]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Session List */}
        <View style={styles.listContainer}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekHeaderTitle}>Week {selectedWeek}</Text>
          </View>

          {currentSessions.length > 0 ? (
            currentSessions.map((item, index) => (
              <SessionAccordion
                key={item.session_id || index}
                session={item}
                index={index}
                mode="execution"
                locale={locale}
                completedIds={new Set()}
                defaultOpen={index === 0}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No sessions planned for this week.</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.saveBtn} onPress={() => setIsSaved(!isSaved)}>
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={isSaved ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addBtn, added && styles.addBtnDone]}
          onPress={added ? undefined : handleClone}
          disabled={added}
          activeOpacity={0.8}
        >
          {added ? (
            <>
              <Ionicons name="checkmark" size={16} color={added ? colors.textSecondary : "#FFF"} />
              <Text style={[styles.addBtnText, added && styles.addBtnTextDone]}>Added</Text>
            </>
          ) : (
            <Text style={styles.addBtnText}>Add to My Plans</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  heroContainer: { width: "100%", overflow: "hidden" },
  heroGradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: "60%" },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.screenPadding,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.black,
    color: "#FFFFFF",
    lineHeight: 32,
    letterSpacing: -1,
  },
  creatorText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  heroMeta: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },

  metaSection: {
    backgroundColor: colors.background,
    padding: 16,
    paddingTop: 14,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaPill: {
    backgroundColor: colors.cardDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.pill,
  },
  metaPillText: { fontSize: 12, fontFamily: theme.fonts.bold, color: "#FFFFFF" },

  navWrapper: { backgroundColor: colors.background, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  navContent: { paddingHorizontal: 16, gap: 10 },
  weekCard: {
    width: 80, height: 60,
    backgroundColor: colors.backgroundSecondary, borderRadius: theme.borderRadius.cardSmall, padding: 8,
    justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  weekCardActive: { backgroundColor: colors.cardDark, borderColor: colors.cardDark },
  weekNum: { fontSize: 12, color: colors.textTertiary, fontFamily: theme.fonts.bold },
  weekNumActive: { color: "#FFFFFF" },
  dotsRow: { flexDirection: "row", gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },

  listContainer: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 12 },
  weekHeader: { marginBottom: 16 },
  weekHeaderTitle: { fontSize: 16, fontFamily: theme.fonts.bold, color: colors.textPrimary },

  emptyBox: { padding: 40, alignItems: "center" },
  emptyText: { color: colors.textSecondary },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    flex: 1,
    backgroundColor: colors.cardDark,
    borderRadius: theme.borderRadius.pill,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addBtnDone: {
    backgroundColor: "transparent",
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  addBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: theme.fonts.bold,
  },
  addBtnTextDone: {
    color: colors.textSecondary,
  },
});
