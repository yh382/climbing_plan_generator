// src/features/activity/MyPlansGrid.tsx
// Compact summary of up to N user plans with "See all" link to the full
// library page. Used in Activity > Training segment.

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import { TrainingPlanCard } from "../../components/plancard";
import { useMyPlans } from "../plans/hooks";
import { planSummaryToTrainingPlan } from "../plans/adapters";

const MAX_PREVIEW = 4;

export default function MyPlansGrid() {
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { plans, loading } = useMyPlans();

  const previewPlans = useMemo(() => {
    const uiPlans = plans
      .filter((p) => p.status !== "completed")
      .map(planSummaryToTrainingPlan)
      .filter((p) => p.source === "ai" || p.source === "custom");
    return uiPlans.slice(0, MAX_PREVIEW);
  }, [plans]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr("我的计划", "My Plans")}</Text>
        <TouchableOpacity onPress={() => router.push("/library/my-plans" as any)} hitSlop={8} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>{tr("全部", "See all")}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.emptyWrap}><ActivityIndicator /></View>
      ) : previewPlans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{tr("暂无计划", "No plans yet")}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {previewPlans.map((p) => (
            <TrainingPlanCard
              key={p.id}
              plan={p}
              variant="compact"
              context="personal"
              handlers={{
                onPress: () =>
                  router.push({ pathname: "/library/plan-overview", params: { planId: p.id, source: "user" } } as any),
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 16, paddingTop: 16 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    title: { fontSize: 18, fontFamily: theme.fonts.black, color: colors.textPrimary },
    seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    seeAllText: { fontSize: 14, fontFamily: theme.fonts.medium, color: colors.textSecondary },
    emptyWrap: { paddingVertical: 20, alignItems: "center" },
    emptyText: { fontSize: 13, color: colors.textTertiary, fontFamily: theme.fonts.regular },
  });
