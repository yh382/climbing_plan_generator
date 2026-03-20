// app/library/plan-overview.tsx
import { useState, useMemo, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { usePlanDetail } from "../../src/features/plans/hooks";
import { plansApi } from "../../src/features/plans/api";
import { SessionAccordion } from "../../src/features/plans/components/SessionAccordion";
import { TRAINING_TYPE_GRADIENTS } from "../../src/components/plancard/PlanCard.gradients";
import type { TrainingType } from "../../src/components/plancard/PlanCard.types";
import type { PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";

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
  const insets = useSafeAreaInsets();

  const { planId, source } = useLocalSearchParams<{ planId: string; source: string }>();
  const { plan, loading, refresh } = usePlanDetail(planId ?? null);

  const locale = useMemo(() => detectLocale(), []);
  const [selectedWeek, setSelectedWeek] = useState(1);
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
      <View style={{ flex: 1, backgroundColor: "#FAFAFA", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAFA", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#9CA3AF", fontSize: 15 }}>Plan not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: "#4F46E5", fontWeight: "700" }}>Go Back</Text>
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
    <View style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      {/* Floating TopBar (overlays hero) */}
      <View style={[styles.floatingTopBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.floatingBtn}>
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>

        {source === "user" ? (
          <TouchableOpacity
            onPress={() => {
              const sl = plan?.status === "active"
                ? (locale === "zh" ? "暂停计划" : "Pause Plan")
                : (locale === "zh" ? "激活计划" : "Activate Plan");
              Alert.alert(
                locale === "zh" ? "计划操作" : "Plan Actions",
                undefined,
                [
                  { text: sl, onPress: handleStatusToggle },
                  { text: locale === "zh" ? "取消" : "Cancel", style: "cancel" },
                ]
              );
            }}
            style={styles.floatingBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero Image */}
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

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)"]}
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

        {/* Week Navigator */}
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
                      params: { sessionJson: JSON.stringify(item), planId: planId ?? "" },
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
      </ScrollView>

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

    </View>
  );
}

const styles = StyleSheet.create({
  // Floating top bar
  floatingTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  floatingBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

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
    padding: 20,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 28,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },

  // Meta section below hero
  metaSection: {
    backgroundColor: "#FFF",
    padding: 16,
    paddingTop: 14,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  activePill: {
    backgroundColor: "#D1FAE5",
  },
  activePillText: {
    color: "#065F46",
  },

  progressLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  progressVal: { fontSize: 12, fontWeight: "700", color: "#111" },
  progressTrack: { height: 6, backgroundColor: "#F3F4F6", borderRadius: 3, marginTop: 4 },
  progressFill: { height: "100%", backgroundColor: "#10B981", borderRadius: 3 },

  navWrapper: { backgroundColor: "#FAFAFA", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  navContent: { paddingHorizontal: 16, gap: 10 },
  weekCard: {
    width: 80, height: 60,
    backgroundColor: "#FFF", borderRadius: 12, padding: 8,
    justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  weekCardActive: { backgroundColor: "#111", borderColor: "#111", transform: [{ scale: 1.05 }] },
  weekNum: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  weekNumActive: { color: "#FFF" },
  dotsRow: { flexDirection: "row", gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" },
  dotActive: { backgroundColor: "#34D399" },

  listContainer: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 12 },
  weekHeader: { marginBottom: 16 },
  weekHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },

  emptyBox: { padding: 40, alignItems: "center" },
  emptyText: { color: "#9CA3AF" },

  bottomFloat: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  mainBtn: {
    backgroundColor: "#111",
    width: "100%",
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  mainBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
});
