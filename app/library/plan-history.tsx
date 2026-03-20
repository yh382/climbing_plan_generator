// app/library/plan-history.tsx
import { useMemo } from "react";
import { View, StyleSheet, FlatList, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";

import { TrainingPlanCard } from "../../src/components/plancard";
import { useMyPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";

export default function PlanHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { plans, loading } = useMyPlans();

  const completedPlans = useMemo(
    () => plans.filter((p) => p.status === "completed").map(planSummaryToTrainingPlan),
    [plans]
  );

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

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : (
        <FlatList
          data={completedPlans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
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
                  showSourceBadge: false,
                  showAuthor: true,
                }}
              />
            </View>
          )}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 28 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyText}>No completed plans yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyText: { marginTop: 12, color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
});
