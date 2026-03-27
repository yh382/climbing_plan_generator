// app/library/plan-history.tsx
import { useMemo } from "react";
import { View, StyleSheet, FlatList, Text, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { TrainingPlanCard } from "../../src/components/plancard";
import { useMyPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { withHeaderTheme } from "../../src/lib/nativeHeaderOptions";

export default function PlanHistoryScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { plans, loading } = useMyPlans();

  const completedPlans = useMemo(
    () => plans.filter((p) => p.status === "completed").map(planSummaryToTrainingPlan),
    [plans]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Plan History", ...withHeaderTheme(colors) }} />

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
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
              <Ionicons name="time-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No completed plans yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

type Colors = ReturnType<typeof useThemeColors>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 100 },
    emptyText: { marginTop: 12, color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  });
