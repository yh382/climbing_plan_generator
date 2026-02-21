// src/components/plancard/variants/HistoryPlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { planThemeByTrainingType, sourceLabel } from "../PlanCard.styles";

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  // simple local format: Jan 13, 2026
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function HistoryPlanCard(props: TrainingPlanCardProps) {
  const { plan, handlers, display } = props;
  const theme = planThemeByTrainingType(plan.trainingType);

  const showSource = display?.showSourceBadge ?? false;
  const showAuthor = display?.showAuthor ?? true;

  const finishedText = useMemo(() => {
    // Use lastTrainedAt as a proxy; later you can add real completedAt
    return formatDate(plan.progress?.lastTrainedAt) ?? "Completed";
  }, [plan.progress?.lastTrainedAt]);

  const rating = plan.market?.ratingAvg;
  const ratingText = typeof rating === "number" ? `${Math.max(0, Math.min(5, rating)).toFixed(1)}` : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handlers?.onPress?.(plan)}
      style={styles.card}
    >
      <View style={[styles.leftBadge, { backgroundColor: theme.bg }]} />

      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.title}>
            {plan.title}
          </Text>

          {ratingText ? (
            <View style={styles.ratingPill}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.rating}>{ratingText}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.subRow}>
          <Text style={styles.subText}>Finished</Text>
          <Text style={styles.subDot}> • </Text>
          <Text style={styles.subText}>{finishedText}</Text>

          {showSource ? (
            <>
              <Text style={styles.subDot}> • </Text>
              <Text style={styles.subText}>{sourceLabel(plan.source)}</Text>
            </>
          ) : null}
        </View>

        {showAuthor && plan.author?.authorName ? (
          <Text numberOfLines={1} style={styles.author}>
            by {plan.author.authorName}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    flexDirection: "row",
  },
  leftBadge: { width: 10 },

  main: { flex: 1, padding: 12 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: "900", color: "#111" },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  star: { color: "#FBBF24", fontSize: 12, fontWeight: "900", marginRight: 6 },
  rating: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },

  subRow: { marginTop: 6, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  subText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  subDot: { fontSize: 12, fontWeight: "900", color: "#9CA3AF" },

  author: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#6B7280" },
});
