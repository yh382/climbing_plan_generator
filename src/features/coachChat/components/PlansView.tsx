// src/features/coachChat/components/PlansView.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { TrainingPlanCard } from "@/components/plancard";
import { useMyPlans, usePublicPlans } from "../../plans/hooks";
import { planSummaryToTrainingPlan } from "../../plans/adapters";
import { plansApi } from "../../plans/api";

type SubTab = "MyPlans" | "History" | "Official" | "Plaza";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "MyPlans", label: "My Plans" },
  { key: "History", label: "History" },
  { key: "Official", label: "Official" },
  { key: "Plaza", label: "Plaza" },
];

export default function PlansView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SubTab>("MyPlans");
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { plans: myPlans, loading: myLoading, refresh: refreshMyPlans } = useMyPlans();
  const { plans: publicPlans, loading: publicLoading } = usePublicPlans();

  // Refresh my plans when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshMyPlans();
    }, [refreshMyPlans])
  );

  const data = useMemo(() => {
    if (activeTab === "MyPlans") {
      return myPlans
        .filter((p) => p.status !== "completed")
        .map(planSummaryToTrainingPlan);
    }
    if (activeTab === "History") {
      return myPlans
        .filter((p) => p.status === "completed")
        .map(planSummaryToTrainingPlan);
    }
    const list = publicPlans.map(planSummaryToTrainingPlan);
    if (activeTab === "Official") {
      return list.filter((p) => p.source === "official");
    }
    return list; // Plaza
  }, [activeTab, myPlans, publicPlans]);

  const loading =
    activeTab === "MyPlans" || activeTab === "History" ? myLoading : publicLoading;
  const isMyTab = activeTab === "MyPlans" || activeTab === "History";

  const handleManageAction = useCallback(
    async (plan: any, action: string) => {
      try {
        switch (action) {
          case "Pause Plan":
            await plansApi.updatePlanStatus(plan.id, "paused");
            break;
          case "Activate Plan":
            await plansApi.updatePlanStatus(plan.id, "active");
            break;
          case "Complete Plan":
            await plansApi.updatePlanStatus(plan.id, "completed");
            break;
          case "Delete Plan":
            Alert.alert("Delete Plan", `Delete "${plan.title}"? This cannot be undone.`, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  await plansApi.deletePlan(plan.id);
                  refreshMyPlans();
                },
              },
            ]);
            return; // don't refresh yet — wait for confirm
        }
        refreshMyPlans();
      } catch {
        Alert.alert("Error", "Failed to update plan.");
      }
    },
    [refreshMyPlans]
  );

  const openManageMenu = useCallback(
    (plan: any) => {
      const buttons: any[] = [];
      if (plan.status === "active") {
        buttons.push({
          text: "Pause Plan",
          onPress: () => handleManageAction(plan, "Pause Plan"),
        });
      } else if (plan.status === "paused") {
        buttons.push({
          text: "Activate Plan",
          onPress: () => handleManageAction(plan, "Activate Plan"),
        });
      }
      if (plan.status !== "completed") {
        buttons.push({
          text: "Complete Plan",
          onPress: () => handleManageAction(plan, "Complete Plan"),
        });
      }
      buttons.push({
        text: "Delete Plan",
        style: "destructive" as const,
        onPress: () => handleManageAction(plan, "Delete Plan"),
      });
      buttons.push({ text: "Cancel", style: "cancel" as const });

      Alert.alert("Manage Plan", plan.title, buttons);
    },
    [handleManageAction]
  );

  const emptyText =
    activeTab === "History"
      ? "No completed plans yet"
      : activeTab === "MyPlans"
        ? "No active plans"
        : "No plans";

  return (
    <View style={styles.container}>
      {/* Sub tabs — pill style + add button */}
      <View style={styles.tabRowOuter}>
        <View style={styles.tabRow}>
          {SUB_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    isActive && styles.tabPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/library/plan-builder")}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Plans list */}
      {loading && data.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <TrainingPlanCard
                plan={item}
                variant={isMyTab ? "compact" : "market"}
                context={isMyTab ? "personal" : "public"}
                handlers={{
                  onPress: () =>
                    router.push({
                      pathname: "/library/plan-overview",
                      params: {
                        planId: item.id,
                        source: isMyTab ? "user" : "market",
                      },
                    }),
                  ...(isMyTab ? { onOpenMenu: () => openManageMenu(item) } : {}),
                }}
                display={{
                  showAuthor: !isMyTab,
                  showSourceBadge: true,
                }}
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name={activeTab === "History" ? "checkmark-done-outline" : "albums-outline"}
                size={44}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabRowOuter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: colors.border,
    marginLeft: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: colors.backgroundSecondary,
  },
  tabPillActive: {
    backgroundColor: colors.cardDark,
  },
  tabPillText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  tabPillTextActive: {
    color: "#FFFFFF",
  },
  cardWrapper: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
  },
  emptyText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 10,
  },
});
