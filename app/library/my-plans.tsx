import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";

import { TrainingPlanCard, TrainingPlan } from "../../src/components/plancard";

// ---- Mock Data ----
// From Others: 你收藏/跟练的别人计划（可视为“已加入我的计划库”）
const SAVED_FROM_OTHERS: TrainingPlan[] = [
  {
    id: "o1",
    title: "Endurance Beast",
    source: "custom",
    visibility: "private",
    status: "paused",
    trainingType: "endurance",
    durationWeeks: 8,
    author: { authorName: "Adam Ondra" },
    progress: { currentWeek: 1, totalWeeks: 8 },
  },
];

// My Custom: 我自己创建的计划（可管理 public/private）
const MY_CUSTOM_PLANS: TrainingPlan[] = [
  {
    id: "m1",
    title: "My Weakness Fix",
    source: "custom",
    visibility: "private",
    status: "active",
    trainingType: "strength",
    durationWeeks: 4,
    author: { authorName: "Me" },
    progress: { currentWeek: 2, totalWeeks: 4 },
  },
];

type TabKey = "Others" | "Custom";

export default function MyPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabKey>("Others");
  const [fabOpen, setFabOpen] = useState(false);

  const data = useMemo(() => {
    return activeTab === "Others" ? SAVED_FROM_OTHERS : MY_CUSTOM_PLANS;
  }, [activeTab]);

  const handleFabAction = (action: "AI" | "Custom") => {
    setFabOpen(false);

    // 这里先占位，你后续接实际创建/AI picker 路由即可
    if (action === "AI") Alert.alert("AI Pick", "Navigate to AI Generator");
    if (action === "Custom") Alert.alert("Create", "Navigate to Plan Creator");
  };

  const openManageMenu = (plan: TrainingPlan) => {
    // Step 6 再接真正的 action sheet / modal
    Alert.alert(
      "Manage Plan",
      `Plan: ${plan.title}\n\n(Next) Public / Private / Archive`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          routeName="my_plans"
          title="My Plans"
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
          rightAccessory={
            <TouchableOpacity onPress={() => router.push("/library/plan-history")}>
              <Ionicons name="time-outline" size={24} color="#111" />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { label: "From Others", key: "Others" as const },
          { label: "My Custom", key: "Custom" as const },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Plans List */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrainingPlanCard
            plan={item}
            variant="compact"
            context="personal"
            handlers={{
              onPress: () =>
                router.push({
                  pathname: "/library/plan-overview",
                  params: { planId: item.id },
                }),
              onOpenMenu: () => openManageMenu(item),
            }}
            display={{
              showSourceBadge: true,
              // 仅 My Custom 默认显示可见性；From Others 也可以显示，但通常没必要
              showVisibilityBadge: activeTab === "Custom",
            }}
          />
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={44} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No plans yet</Text>
            <Text style={styles.emptySub}>
              {activeTab === "Others"
                ? "Save a plan from the community to see it here."
                : "Create your first custom plan."}
            </Text>
          </View>
        }
      />

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
              <View style={[styles.miniFab, { backgroundColor: "#4F46E5" }]}>
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

const styles = StyleSheet.create({
  tabContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#111" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#111", fontWeight: "800" },

  empty: { alignItems: "center", justifyContent: "center", marginTop: 90, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontSize: 15, fontWeight: "900", color: "#111" },
  emptySub: { marginTop: 6, fontSize: 13, fontWeight: "600", color: "#9CA3AF", textAlign: "center" },

  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    zIndex: 100,
  },
  fabOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.8)", zIndex: 90 },
  fabActions: { position: "absolute", right: 24, alignItems: "flex-end", gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionText: { fontSize: 14, fontWeight: "700", color: "#111" },
  miniFab: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
