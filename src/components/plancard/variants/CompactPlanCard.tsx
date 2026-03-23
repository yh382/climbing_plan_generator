// src/components/plancard/variants/CompactPlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { statusLabel } from "../PlanCard.styles";
import { TRAINING_TYPE_GRADIENTS } from "../PlanCard.gradients";
import { theme } from "../../../lib/theme";

export default function CompactPlanCard(props: TrainingPlanCardProps) {
  const { plan, handlers, context } = props;

  const gradient = TRAINING_TYPE_GRADIENTS[plan.trainingType] ?? TRAINING_TYPE_GRADIENTS.mixed;
  const hasCover = !!plan.coverImageUri;
  const typeLabel = plan.trainingType.charAt(0).toUpperCase() + plan.trainingType.slice(1);

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    if (plan.durationWeeks) parts.push(`${plan.durationWeeks} weeks`);
    const sess = plan.progress?.sessionsPlanned;
    const tw = plan.progress?.totalWeeks ?? plan.durationWeeks;
    if (typeof sess === "number" && typeof tw === "number" && tw > 0) {
      parts.push(`${Math.round(sess / tw)}/wk`);
    }
    return parts.join(" · ");
  }, [plan]);

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
        {/* Top: type pill + menu */}
        <View style={styles.topRow}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{typeLabel}</Text>
          </View>

          {handlers?.onOpenMenu && context === "personal" ? (
            <TouchableOpacity
              onPress={() => handlers.onOpenMenu?.(plan)}
              style={styles.menuBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.menuText}>⋯</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Title */}
        <Text numberOfLines={2} style={styles.title}>
          {plan.title}
        </Text>

        {/* Meta line */}
        {metaLine ? (
          <Text style={styles.metaText}>{metaLine}</Text>
        ) : null}

        {/* Bottom: author + status */}
        <View style={styles.bottomRow}>
          {plan.author?.authorName ? (
            <Text numberOfLines={1} style={styles.bottomText}>
              By {plan.author.authorName}
            </Text>
          ) : null}
          <Text style={styles.bottomText}>{statusLabel(plan.status)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    height: 160,
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
  menuBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    fontSize: 14,
    fontWeight: "900",
    fontFamily: theme.fonts.black,
    color: "#FFFFFF",
    lineHeight: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fonts.black,
    color: "#FFFFFF",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bottomText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.70)",
  },
});
