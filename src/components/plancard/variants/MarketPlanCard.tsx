// src/components/plancard/variants/MarketPlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { sourceLabel } from "../PlanCard.styles";
import { TRAINING_TYPE_GRADIENTS } from "../PlanCard.gradients";
import { theme } from "../../../lib/theme";

function formatRating(avg?: number) {
  if (typeof avg !== "number") return null;
  return Math.max(0, Math.min(5, avg)).toFixed(1);
}

function formatLevel(min?: string, max?: string, label?: string) {
  if (label) return label;
  if (min && max) return `${min}–${max}`;
  if (min) return `${min}+`;
  if (max) return `≤${max}`;
  return null;
}

export default function MarketPlanCard(props: TrainingPlanCardProps) {
  const { plan, handlers, display, context } = props;

  const gradient = TRAINING_TYPE_GRADIENTS[plan.trainingType] ?? TRAINING_TYPE_GRADIENTS.mixed;
  const hasCover = !!plan.coverImageUri;
  const typeLabel = plan.trainingType.charAt(0).toUpperCase() + plan.trainingType.slice(1);

  const ratingText = useMemo(
    () => formatRating(plan.market?.ratingAvg),
    [plan.market?.ratingAvg]
  );

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (plan.durationWeeks) parts.push(`${plan.durationWeeks} wks`);
    if (plan.estSessionMinutes) parts.push(`${plan.estSessionMinutes} min`);
    const lvl = formatLevel(plan.levelRange?.min, plan.levelRange?.max, plan.levelRange?.label);
    if (lvl) parts.push(lvl);
    if (typeof plan.market?.followerCount === "number" && plan.market.followerCount > 0) {
      parts.push(`${plan.market.followerCount} followers`);
    }
    return parts.join(" · ");
  }, [plan]);

  const showSource = display?.showSourceBadge ?? true;

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
        {/* Top: type pill + rating */}
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
        <Text numberOfLines={2} style={styles.title}>
          {plan.title}
        </Text>

        {/* Author */}
        {display?.showAuthor !== false ? (
          <Text numberOfLines={1} style={styles.author}>
            {plan.author?.authorName
              ? `by ${plan.author.authorName}`
              : showSource
                ? `by ${sourceLabel(plan.source)}`
                : ""}
          </Text>
        ) : null}

        {/* Bottom: meta + hint */}
        <View>
          {metaLine ? <Text style={styles.metaText}>{metaLine}</Text> : null}
          {context === "public" ? <Text style={styles.hint}>Tap to view</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    height: 180,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typePill: {
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.70)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  star: { color: "#FBBF24", fontSize: 12, fontWeight: "900", fontFamily: theme.fonts.black, marginRight: 4 },
  ratingText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", fontFamily: theme.fonts.bold },

  title: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: theme.fonts.black,
    color: "#FFFFFF",
    lineHeight: 24,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  author: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.80)",
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.55)",
  },
});
