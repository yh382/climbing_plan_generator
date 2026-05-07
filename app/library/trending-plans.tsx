// app/library/trending-plans.tsx
import { useLayoutEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { TRAINING_INTENTS, TrainingIntent } from "../../src/components/plancard";

import { TrainingPlanCard } from "../../src/components/plancard";
import { usePublicPlans } from "../../src/features/plans/hooks";
import { planSummaryToTrainingPlan } from "../../src/features/plans/adapters";

import { useThemeColors } from "../../src/lib/useThemeColors";
import { NATIVE_HEADER_BASE, withHeaderTheme } from "../../src/lib/nativeHeaderOptions";

export default function TrendingPlansScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [intent, setIntent] = useState<TrainingIntent>("all");

  // --- Native header ---
  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_BASE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: "Trending Plans",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, colors, router]);

  const { plans, loading } = usePublicPlans();

  const data = useMemo(() => {
    const uiPlans = plans.map(planSummaryToTrainingPlan);
    if (intent === "all") return uiPlans;
    return uiPlans.filter((p) => p.trainingType === intent);
  }, [plans, intent]);

  const ChipsHeader = (
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
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={ChipsHeader}
          contentContainerStyle={{ paddingBottom: 28 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
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
    </View>
  );
}

type Colors = ReturnType<typeof useThemeColors>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    chipsWrap: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
    chipOn: { backgroundColor: colors.pillBackground },
    chipOff: { backgroundColor: colors.cardBackground },
    chipText: { fontSize: 13, fontWeight: "800" },
    chipTextOn: { color: colors.pillText },
    chipTextOff: { color: colors.textPrimary },

    empty: { padding: 24, alignItems: "center", marginTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.textPrimary },
    emptySub: { marginTop: 6, fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  });
