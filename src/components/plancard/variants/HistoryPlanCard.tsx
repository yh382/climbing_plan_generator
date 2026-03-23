// src/components/plancard/variants/HistoryPlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { sourceLabel } from "../PlanCard.styles";
import { TRAINING_TYPE_GRADIENTS } from "../PlanCard.gradients";
import { theme } from "../../../lib/theme";

function formatDate(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function HistoryPlanCard(props: TrainingPlanCardProps) {
  const { plan, handlers, display } = props;

  const gradient = TRAINING_TYPE_GRADIENTS[plan.trainingType] ?? TRAINING_TYPE_GRADIENTS.mixed;
  const hasCover = !!plan.coverImageUri;
  const typeLabel = plan.trainingType.charAt(0).toUpperCase() + plan.trainingType.slice(1);

  const showSource = display?.showSourceBadge ?? false;
  const showAuthor = display?.showAuthor ?? true;

  const finishedText = useMemo(() => {
    return formatDate(plan.progress?.lastTrainedAt) ?? "Completed";
  }, [plan.progress?.lastTrainedAt]);

  const rating = plan.market?.ratingAvg;
  const ratingText = typeof rating === "number" ? Math.max(0, Math.min(5, rating)).toFixed(1) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handlers?.onPress?.(plan)}
      style={styles.card}
    >
      {/* Background: cover image or gradient */}
      {hasCover ? (
        <Image
          source={{ uri: plan.coverImageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Dark overlay */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Top: type pill + rating pill */}
        <View style={styles.topRow}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{typeLabel}</Text>
          </View>

          {ratingText ? (
            <View style={styles.ratingPill}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>{ratingText}</Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text numberOfLines={1} style={styles.title}>
          {plan.title}
        </Text>

        {/* Bottom: finished + source + author */}
        <View style={styles.bottomRow}>
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed</Text>
          </View>
          <Text style={styles.bottomText}>{finishedText}</Text>
          {showSource ? (
            <Text style={styles.bottomText}>{sourceLabel(plan.source)}</Text>
          ) : null}
          {showAuthor && plan.author?.authorName ? (
            <Text numberOfLines={1} style={styles.bottomText}>
              by {plan.author.authorName}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    height: 150,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  content: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typePill: {
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.70)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  star: { color: "#FBBF24", fontSize: 11, fontWeight: "900", fontFamily: theme.fonts.black, marginRight: 4 },
  ratingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", fontFamily: theme.fonts.bold },

  title: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: theme.fonts.black,
    color: "#FFFFFF",
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  completedBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  completedText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "rgba(255,255,255,0.85)",
  },
  bottomText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.70)",
  },
});
