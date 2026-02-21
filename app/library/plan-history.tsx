// app/library/plan-history.tsx

import React from "react";
import { View, StyleSheet, FlatList, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";

import { TrainingPlanCard, TrainingPlan } from "../../src/components/plancard";

// Mock Data: 历史计划（已完成）
// 说明：HistoryPlanCard 会优先读取 plan.progress.lastTrainedAt 来显示 “Finished on …”
const HISTORY_PLANS: TrainingPlan[] = [
  {
    id: "h1",
    title: "Beginner Core",
    source: "official",
    visibility: "private",
    status: "completed",
    trainingType: "technique", // 没有 core 类型时先用 technique/mixed/recovery 之一（后续你可扩展 TrainingType）
    durationWeeks: 4,
    author: { authorName: "ClimMate" },
    market: { ratingAvg: 4.2, followerCount: 8500 },
    progress: {
      lastTrainedAt: "2025-10-24T00:00:00Z", // 完成日期占位
    },
  },
  {
    id: "h2",
    title: "Finger Rehab",
    source: "official",
    visibility: "private",
    status: "completed",
    trainingType: "recovery",
    durationWeeks: 4,
    author: { authorName: "Hooper's Beta" },
    market: { ratingAvg: 4.9, followerCount: 2100 },
    progress: {
      lastTrainedAt: "2025-10-24T00:00:00Z",
    },
  },
];

export default function PlanHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          routeName="plan_history"
          title="Plan History"
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
        />
      </View>

      <FlatList
        data={HISTORY_PLANS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TrainingPlanCard
            plan={item}
            variant="history"
            context="personal"
            handlers={{
              onPress: () =>
                router.push({
                  pathname: "/library/plan-overview",
                  params: { planId: item.id, source: "history" },
                }),
            }}
            display={{
              // History 场景一般不需要 source；你想显示也可设 true
              showSourceBadge: false,
              showAuthor: true,
            }}
          />
        )}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={48} color="#E5E7EB" />
            <Text style={styles.emptyText}>No completed plans yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyText: { marginTop: 12, color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
});
