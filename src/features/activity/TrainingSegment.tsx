// src/features/activity/TrainingSegment.tsx
// Training segment of the Activity tab: Current Training plan, a summary
// grid of My Plans, and a summary list of Favorite Exercises.

import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import { TrainingPlanCard } from "../../components/plancard";
import { planDetailToTrainingPlan } from "../plans/adapters";
import { usePlanStore } from "../../store/usePlanStore";
import useActiveWorkoutStore from "../../store/useActiveWorkoutStore";
import MyPlansGrid from "./MyPlansGrid";
import FavoriteExercisesGrid from "./FavoriteExercisesGrid";
import MonthCalendar from "./MonthCalendar";
import ActivitySegmentBar from "./ActivitySegmentBar";
import ActivitySubtitle from "./ActivitySubtitle";
import { ScrollEdgeFallback } from "@/components/shared/ScrollEdgeFallback";

export default function TrainingSegment() {
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { activePlan: activePlanData, fetchActivePlan } = usePlanStore();
  const {
    isActive: workoutActive,
    isMinimized: workoutMinimized,
    seconds: workoutSeconds,
    sessionJson: workoutSessionJson,
  } = useActiveWorkoutStore();

  useFocusEffect(
    useCallback(() => {
      fetchActivePlan();
    }, [fetchActivePlan])
  );

  const activePlan = useMemo(() => {
    if (!activePlanData) return null;
    return planDetailToTrainingPlan(activePlanData);
  }, [activePlanData]);

  return (
    <ScrollEdgeFallback>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 140 }}
    >
      <ActivitySubtitle />
      <ActivitySegmentBar />
      <MonthCalendar />
      {/* Current Training */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{tr("当前训练", "Current Training")}</Text>
      </View>

      {activePlan ? (
        <View style={{ paddingHorizontal: 16 }}>
          <TrainingPlanCard
            plan={activePlan}
            variant="active"
            context="personal"
            workoutTimer={
              workoutActive && workoutMinimized
                ? `${String(Math.floor(workoutSeconds / 60)).padStart(2, "0")}:${String(workoutSeconds % 60).padStart(2, "0")}`
                : undefined
            }
            handlers={{
              onPress: () =>
                router.push({
                  pathname: "/library/plan-overview",
                  params: { planId: activePlanData?.id, source: "user" },
                } as any),
              primaryAction: {
                action: { type: "continue", label: tr("查看计划", "View Plan") },
                onAction: () =>
                  router.push({
                    pathname: "/library/plan-overview",
                    params: { planId: activePlanData?.id, source: "user" },
                  } as any),
              },
              onResumeWorkout: workoutSessionJson
                ? () =>
                    router.push({
                      pathname: "/library/plan-view",
                      params: { sessionJson: workoutSessionJson },
                    } as any)
                : undefined,
            }}
            display={{ showSourceBadge: true, showVisibilityBadge: false }}
          />
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{tr("暂无训练计划", "No Active Plan")}</Text>
          <Text style={styles.emptySub}>{tr("创建计划开始训练！", "Create a plan to start training!")}</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/library/plans" as any)}>
            <Text style={styles.createBtnText}>{tr("浏览计划", "Browse Plans")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <MyPlansGrid />
      <FavoriteExercisesGrid />
    </ScrollView>
    </ScrollEdgeFallback>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
    },
    emptyCard: {
      marginHorizontal: 16,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: theme.borderRadius.card,
      padding: 16,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "800",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    emptySub: {
      marginTop: 6,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    createBtn: {
      marginTop: 12,
      alignSelf: "flex-start",
      backgroundColor: colors.cardDark,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    createBtnText: {
      color: "#FFF",
      fontWeight: "800",
      fontFamily: theme.fonts.bold,
    },
  });
