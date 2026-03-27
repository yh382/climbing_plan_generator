// app/library/my-plans.tsx
import { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { NativeSegmentedControl } from "../../src/components/ui";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TrainingPlanCard } from "../../src/components/plancard";
import { useMyPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";
import { plansApi } from "../../src/features/plans/api";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { withHeaderTheme } from "../../src/lib/nativeHeaderOptions";

type TabKey = "Others" | "Custom";
const TAB_KEYS: TabKey[] = ["Custom", "Others"];
const TAB_LABELS = ["My Custom", "From Others"];

export default function MyPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<TabKey>("Custom");
  const [fabOpen, setFabOpen] = useState(false);

  const { plans, loading, refresh } = useMyPlans();

  const data = useMemo(() => {
    // Filter out completed plans — they belong in Plan History
    const uiPlans = plans
      .filter((p) => p.status !== "completed")
      .map(planSummaryToTrainingPlan);
    if (activeTab === "Custom") {
      return uiPlans.filter((p) => p.source === "ai" || p.source === "custom");
    }
    // "Others" = official plans or forked plans
    return uiPlans.filter((p) => p.source === "official" || p.forkedFromPlanId);
  }, [plans, activeTab]);

  const handleFabAction = (action: "AI" | "Custom") => {
    setFabOpen(false);
    if (action === "AI") {
      Alert.alert("Coming Soon", "AI plan generation will be available with Coach AI");
      return;
    }
    if (action === "Custom") {
      router.push("/library/plan-builder" as any);
    }
  };

  const handleManageAction = async (plan: any, action: string) => {
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
                refresh();
              },
            },
          ]);
          return; // don't refresh yet — wait for confirm
      }
      refresh();
    } catch {
      Alert.alert("Error", "Failed to update plan.");
    }
  };

  const openManageMenu = (plan: any) => {
    const buttons: any[] = [];
    if (plan.status === "active") {
      buttons.push({ text: "Pause Plan", onPress: () => handleManageAction(plan, "Pause Plan") });
    } else if (plan.status === "paused") {
      buttons.push({ text: "Activate Plan", onPress: () => handleManageAction(plan, "Activate Plan") });
    }
    buttons.push({ text: "Complete Plan", onPress: () => handleManageAction(plan, "Complete Plan") });
    buttons.push({ text: "Delete Plan", style: "destructive", onPress: () => handleManageAction(plan, "Delete Plan") });
    buttons.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Manage Plan", plan.title, buttons);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: "My Plans",
        ...withHeaderTheme(colors),
      }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="clock.arrow.circlepath"
          onPress={() => router.push("/library/plan-history")}
        />
      </Stack.Toolbar>

      {/* Tabs — native segmented control */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        <NativeSegmentedControl
          options={TAB_LABELS}
          selectedIndex={TAB_KEYS.indexOf(activeTab)}
          onSelect={(i) => setActiveTab(TAB_KEYS[i])}
        />
      </View>

      {/* Plans List */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              <TrainingPlanCard
                plan={item}
                variant="compact"
                context="personal"
                handlers={{
                  onPress: () =>
                    router.push({
                      pathname: "/library/plan-overview",
                      params: { planId: item.id, source: "user" },
                    }),
                  onOpenMenu: () => openManageMenu(item),
                }}
                display={{
                  showSourceBadge: true,
                  showVisibilityBadge: activeTab === "Custom",
                }}
              />
            </View>
          )}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={44} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No plans yet</Text>
              <Text style={styles.emptySub}>
                {activeTab === "Others"
                  ? "Save a plan from the community to see it here."
                  : "Create your first custom plan."}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB Overlay */}
      {fabOpen && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setFabOpen(false)}
        >
          <View style={[styles.fabActions, { bottom: insets.bottom + 80 }]}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleFabAction("Custom")}
            >
              <Text style={styles.actionText}>Customize</Text>
              <View style={[styles.miniFab, { backgroundColor: colors.accent }]}>
                <Ionicons name="construct" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleFabAction("AI")}
            >
              <Text style={styles.actionText}>AI Pick</Text>
              <View style={[styles.miniFab, { backgroundColor: "#10B981" }]}>
                <Ionicons name="sparkles" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Main FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.8}
        onPress={() => setFabOpen((v) => !v)}
      >
        <Ionicons name={fabOpen ? "close" : "add"} size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

type Colors = ReturnType<typeof useThemeColors>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    empty: { alignItems: "center", justifyContent: "center", marginTop: 90, paddingHorizontal: 24 },
    emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: colors.textPrimary },
    emptySub: { marginTop: 6, fontSize: 13, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },

    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.pillBackground,
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
      zIndex: 100,
    },
    fabOverlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: colors.background + 'CC', // 80% opacity
      zIndex: 90,
    },
    fabActions: { position: "absolute", right: 24, alignItems: "flex-end", gap: 16 },
    actionBtn: { flexDirection: "row", alignItems: "center", gap: 12 },
    actionText: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
    miniFab: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  });
