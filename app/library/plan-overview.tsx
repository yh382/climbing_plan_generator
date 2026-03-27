// app/library/plan-overview.tsx
import { useState, useMemo, useCallback, useLayoutEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions, Share } from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

import { usePlanDetail } from "../../src/features/plans/hooks";
import { plansApi } from "../../src/features/plans/api";
import { SessionAccordion } from "../../src/features/plans/components/SessionAccordion";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { TRAINING_TYPE_GRADIENTS } from "../../src/components/plancard/PlanCard.gradients";
import type { TrainingType } from "../../src/components/plancard/PlanCard.types";
import type { PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";

import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from "react-native-reanimated";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HERO_HEIGHT = SCREEN_WIDTH * 0.65; // ~65% width for hero image

function detectLocale(): "zh" | "en" {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

export default function PlanOverviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { planId, source } = useLocalSearchParams<{ planId: string; source: string }>();
  const { plan, loading, refresh } = usePlanDetail(planId ?? null);

  const locale = useMemo(() => detectLocale(), []);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const heroParallaxStyle = useAnimatedStyle(() => {
    const adjustedScrollY = scrollY.value + headerHeight;
    if (adjustedScrollY >= 0) return {};
    const absScroll = -adjustedScrollY;
    return {
      transform: [
        { scale: 1 + absScroll / HERO_HEIGHT },
        { translateY: adjustedScrollY / 2 },
      ],
    };
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      scrollEdgeEffects: { top: 'soft' },
    });
  }, [navigation, router, plan]);

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // Derive weeks and sessions from planJson
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

  // Sessions for selected week (distribute evenly across weeks)
  const currentSessions = useMemo(() => {
    if (sessionsPerWeek <= 0 || allSessions.length === 0) return allSessions;
    const start = (selectedWeek - 1) * sessionsPerWeek;
    return allSessions.slice(start, start + sessionsPerWeek);
  }, [allSessions, sessionsPerWeek, selectedWeek]);

  const weeksArray = useMemo(() => Array.from({ length: totalWeeks }, (_, i) => i + 1), [totalWeeks]);

  // Load completion states from AsyncStorage (refresh on focus for returning from workout)
  useFocusEffect(
    useCallback(() => {
      if (!planId || source === "market") return;
      const allItems = currentSessions.flatMap((s) =>
        s.blocks.flatMap((b) => b.items.map((it) => it.action_id))
      );
      if (allItems.length === 0) return;

      (async () => {
        const ids = new Set<string>();
        for (const actionId of allItems) {
          const key = `exercise_completion_${planId}_${actionId}`;
          const val = await AsyncStorage.getItem(key);
          if (val === "true") ids.add(actionId);
        }
        setCompletedIds(ids);
      })();
    }, [planId, source, currentSessions])
  );

  const handleExercisePress = useCallback(
    (item: PlanV3SessionItem) => {
      router.push({
        pathname: "/library/exercise-detail",
        params: {
          exerciseId: item.action_id,
          context: "library",
          planId: planId ?? "",
          sessionId: "",
        },
      });
    },
    [router, source, planId]
  );

  const showAddButton = source === "market";

  const handleAddToMyPlans = async () => {
    if (!plan) return;
    try {
      await plansApi.updatePlanStatus(plan.id, "active");
      Alert.alert("Success", "Plan activated!", [
        { text: "OK", onPress: () => router.push("/library/my-plans") },
      ]);
    } catch {
      Alert.alert("Error", "Failed to activate plan.");
    }
  };

  const handleStatusToggle = async () => {
    if (!plan) return;
    const newStatus = plan.status === "active" ? "paused" : "active";
    try {
      await plansApi.updatePlanStatus(plan.id, newStatus);
      refresh();
    } catch {
      Alert.alert("Error", "Failed to update plan status.");
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

  const progressRatio = plan.planJson?.meta?.current_week && totalWeeks
    ? Math.round((plan.planJson.meta.current_week / totalWeeks) * 100)
    : 0;

  const coverUrl = plan.coverImageUrl;
  const gradient = TRAINING_TYPE_GRADIENTS[(plan.trainingType as TrainingType) || "mixed"] ?? TRAINING_TYPE_GRADIENTS.mixed;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Image */}
        <Animated.View style={[heroParallaxStyle, { marginTop: -headerHeight, overflow: "hidden" }]}>
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Bottom gradient overlay — cool black #0D0F10 */}
          <LinearGradient
            colors={["transparent", "#0D0F10"]}
            style={styles.heroGradient}
          />

          {/* Title + meta on image */}
          <View style={styles.heroContent}>
            <Text numberOfLines={2} style={styles.heroTitle}>{plan.title}</Text>
            <Text style={styles.heroMeta}>
              {totalWeeks} weeks · ~{sessionsPerWeek} sessions/wk
              {plan.trainingType ? ` · ${plan.trainingType}` : ""}
            </Text>
          </View>
        </View>
        </Animated.View>

        {/* Meta tags + progress */}
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
            <View style={[styles.metaPill, plan.status === "active" && styles.activePill]}>
              <Text style={[styles.metaPillText, plan.status === "active" && styles.activePillText]}>
                {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Progress bar for user's own plan */}
          {source === "user" && progressRatio > 0 ? (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={styles.progressLabel}>Plan Progress</Text>
                <Text style={styles.progressVal}>{progressRatio}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressRatio}%` }]} />
              </View>
            </View>
          ) : null}
        </View>

        {/* Week Navigator — paddingTop offsets sticky position below floating TopBar */}
        <View style={styles.navWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navContent}
          >
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
            currentSessions.map((item, index) => {
              const sessionItemIds = item.blocks.flatMap(b => b.items.map(it => it.action_id));
              const sessionDone = sessionItemIds.length > 0 && sessionItemIds.every(id => completedIds.has(id));
              return (
                <SessionAccordion
                  key={item.session_id || index}
                  session={item}
                  index={index}
                  mode="execution"
                  locale={locale}
                  completedIds={completedIds}
                  defaultOpen={index === 0 && !sessionDone}
                  onExercisePress={(exerciseItem) => handleExercisePress(exerciseItem)}
                  onStartSession={source === "user" ? () => {
                    router.push({
                      pathname: "/library/plan-view",
                      params: {
                        sessionJson: JSON.stringify(item),
                        planId: planId ?? "",
                        planSessionId: item.session_id || "",
                      },
                    } as any);
                  } : undefined}
                />
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No sessions planned for this week.</Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom action */}
      {showAddButton && (
        <View style={[styles.bottomFloat, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.mainBtn}
            activeOpacity={0.8}
            onPress={handleAddToMyPlans}
          >
            <Text style={styles.mainBtnText}>Add to My Plans</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Native toolbar menu */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis.circle">
          <Stack.Toolbar.MenuAction
            icon="square.and.pencil"
            onPress={() => {
              router.push({
                pathname: '/community/create',
                params: {
                  prefillAttachType: 'plan',
                  prefillAttachId: planId,
                  prefillAttachTitle: plan?.title || '',
                  prefillAttachSubtitle: `${totalWeeks} weeks · ${sessionsPerWeek || '—'} sessions/wk · ${plan?.trainingType || ''}`,
                },
              });
            }}
          >
            Share to Post
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={async () => {
              await Share.share({ message: `Check out "${plan?.title}" training plan on ClimMate!` });
            }}
          >
            Share via...
          </Stack.Toolbar.MenuAction>
          {source === "user" && plan.status !== "completed" ? (
            <Stack.Toolbar.MenuAction
              icon={plan.status === "active" ? "pause.circle" : "play.circle"}
              onPress={handleStatusToggle}
            >
              {plan.status === "active"
                ? (locale === "zh" ? "暂停计划" : "Pause Plan")
                : (locale === "zh" ? "激活计划" : "Activate Plan")}
            </Stack.Toolbar.MenuAction>
          ) : null}
          {source === "user" && plan.status !== "completed" ? (
            <Stack.Toolbar.MenuAction
              icon="checkmark.circle"
              onPress={() => {
                Alert.alert(
                  locale === "zh" ? "完成计划" : "Complete Plan",
                  locale === "zh" ? "标记为已完成？" : "Mark this plan as completed?",
                  [
                    { text: locale === "zh" ? "取消" : "Cancel", style: "cancel" as const },
                    {
                      text: locale === "zh" ? "确认" : "Confirm",
                      onPress: async () => {
                        try {
                          await plansApi.updatePlanStatus(plan.id, "completed");
                          router.back();
                        } catch {
                          Alert.alert("Error", "Failed to complete plan.");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              {locale === "zh" ? "完成计划" : "Complete Plan"}
            </Stack.Toolbar.MenuAction>
          ) : null}
          {source === "user" ? (
            <Stack.Toolbar.MenuAction
              icon="trash"
              destructive
              onPress={() => {
                Alert.alert(
                  locale === "zh" ? "删除计划" : "Delete Plan",
                  locale === "zh" ? "删除后无法恢复" : "This cannot be undone.",
                  [
                    { text: locale === "zh" ? "取消" : "Cancel", style: "cancel" as const },
                    {
                      text: locale === "zh" ? "删除" : "Delete",
                      style: "destructive" as const,
                      onPress: async () => {
                        try {
                          await plansApi.deletePlan(plan.id);
                          router.back();
                        } catch {
                          Alert.alert("Error", "Failed to delete plan.");
                        }
                      },
                    },
                  ]
                );
              }}
            >
              {locale === "zh" ? "删除计划" : "Delete Plan"}
            </Stack.Toolbar.MenuAction>
          ) : null}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  // Hero
  heroContainer: {
    width: "100%",
    overflow: "hidden",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
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
  heroMeta: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
  },

  // Meta section below hero
  metaSection: {
    backgroundColor: colors.background,
    padding: 16,
    paddingTop: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    backgroundColor: colors.cardDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.pill,
  },
  metaPillText: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
  activePill: {
    backgroundColor: colors.accent,
  },
  activePillText: {
    color: "#FFFFFF",
  },

  progressLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: colors.textSecondary },
  progressVal: { fontSize: 12, fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 4 },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 2 },

  navWrapper: { backgroundColor: colors.background, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
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

  bottomFloat: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  mainBtn: {
    backgroundColor: colors.cardDark,
    width: "100%",
    height: 54,
    borderRadius: theme.borderRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtnText: { color: "#FFF", fontFamily: theme.fonts.bold, fontSize: 16 },

});
