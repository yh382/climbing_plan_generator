// app/library/trending-plans.tsx
import { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TRAINING_INTENTS, TrainingIntent } from "../../src/components/plancard";

import { TrainingPlanCard } from "../../src/components/plancard";
import { usePublicPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";

export default function TrendingPlansScreen() {
  const router = useRouter();
  const [intent, setIntent] = useState<TrainingIntent>("all");

  const { plans, loading } = usePublicPlans();

  const data = useMemo(() => {
    const uiPlans = plans.map(planSummaryToTrainingPlan);
    if (intent === "all") return uiPlans;
    return uiPlans.filter((p) => p.trainingType === intent);
  }, [plans, intent]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Trending Plans</Text>

        <View style={styles.iconBtn} />
      </View>

      {/* Intent chips */}
      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TRAINING_INTENTS}
          keyExtractor={(i) => i.key}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          renderItem={({ item }) => {
            const selected = item.key === intent;
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setIntent(item.key)}
                style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextOn : styles.chipTextOff]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 28 }}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              <TrainingPlanCard
                plan={item}
                variant="market"
                context="public"
                handlers={{
                  onPress: () =>
                    router.push({
                      pathname: "/library/plan-overview",
                      params: { planId: item.id, source: "market" },
                    }),
                }}
                display={{
                  showAuthor: true,
                  showSourceBadge: true,
                }}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No plans</Text>
              <Text style={styles.emptySub}>Try another category.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EEF2F7",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 17, fontWeight: "800", color: "#111" },

  chipsWrap: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EEF2F7" },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
  chipOn: { backgroundColor: "#111827" },
  chipOff: { backgroundColor: "#F3F4F6" },
  chipText: { fontSize: 13, fontWeight: "800" },
  chipTextOn: { color: "#FFFFFF" },
  chipTextOff: { color: "#111827" },

  empty: { padding: 24, alignItems: "center", marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111" },
  emptySub: { marginTop: 6, fontSize: 13, color: "#6B7280", fontWeight: "600" },
});
