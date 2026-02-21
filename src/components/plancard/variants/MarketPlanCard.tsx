// src/components/plancard/variants/MarketPlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from "react-native";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { planThemeByTrainingType, sourceLabel } from "../PlanCard.styles";

function formatRating(avg?: number, count?: number) {
  if (typeof avg !== "number") return null;
  const score = Math.max(0, Math.min(5, avg));
  if (typeof count === "number" && count > 0) return `${score.toFixed(1)}`;
  return `${score.toFixed(1)}`;
}

function formatWeeks(weeks?: number) {
  if (!weeks) return null;
  return `${weeks} Wks`;
}

function formatMinutes(mins?: number) {
  if (!mins) return null;
  return `${mins} min`;
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
  const theme = planThemeByTrainingType(plan.trainingType);

  const ratingText = useMemo(
    () => formatRating(plan.market?.ratingAvg, plan.market?.ratingCount),
    [plan.market?.ratingAvg, plan.market?.ratingCount]
  );

  const weeksText = useMemo(() => formatWeeks(plan.durationWeeks), [plan.durationWeeks]);
  const minsText = useMemo(() => formatMinutes(plan.estSessionMinutes), [plan.estSessionMinutes]);

  const levelText = useMemo(
    () => formatLevel(plan.levelRange?.min, plan.levelRange?.max, plan.levelRange?.label),
    [plan.levelRange?.min, plan.levelRange?.max, plan.levelRange?.label]
  );

  const showSource = display?.showSourceBadge ?? true;

  const onPress = () => handlers?.onPress?.(plan);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.wrap}>
      <ImageBackground
        source={plan.coverImageUri ? { uri: plan.coverImageUri } : undefined}
        style={[styles.card, { backgroundColor: "#9CA3AF" }]}
        imageStyle={styles.image}
      >
        {/* 顶部渐变遮罩（无渐变库就用半透明层） */}
        <View style={styles.overlay} />

        {/* Type tag */}
        <View style={styles.topRow}>
          <View style={[styles.typeTag, { backgroundColor: theme.bg }]}>
            <Text style={styles.typeTagText}>{plan.trainingType.toUpperCase()}</Text>
          </View>

          {typeof ratingText === "string" ? (
            <View style={styles.ratingPill}>
              <Text style={styles.star}>★</Text>
              <Text style={styles.ratingText}>{ratingText}</Text>
            </View>
          ) : null}
        </View>

        {/* Title area */}
        <View style={styles.content}>
          <Text numberOfLines={2} style={styles.title}>
            {plan.title}
          </Text>

          {display?.showAuthor !== false ? (
            <Text numberOfLines={1} style={styles.author}>
              {plan.author?.authorName ? `by ${plan.author.authorName}` : showSource ? `by ${sourceLabel(plan.source)}` : ""}
            </Text>
          ) : null}

          {/* Info Row (weeks | level | followers) */}
          <View style={styles.metaRow}>
            {weeksText ? <Text style={styles.metaText}>⏱ {weeksText}</Text> : null}
            {minsText ? <Text style={styles.metaText}> · {minsText}</Text> : null}
            {levelText ? <Text style={styles.metaText}> · {levelText}</Text> : null}

            {typeof plan.market?.followerCount === "number" ? (
              <Text style={styles.metaText}> · 👥 {plan.market.followerCount}</Text>
            ) : null}
          </View>

          {/* Optional public-context CTA hint (不要做按钮，保持卡片干净) */}
          {context === "public" ? <Text style={styles.hint}>Tap to view</Text> : null}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 10 },
  card: {
    height: 150,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  image: { borderRadius: 18, resizeMode: "cover" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },

  topRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  typeTagText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.78)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  star: { color: "#FBBF24", fontSize: 13, fontWeight: "900", marginRight: 6 },
  ratingText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },

  content: { padding: 14 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "900", lineHeight: 28 },
  author: { color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 2, fontWeight: "700" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  metaText: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "700" },

  hint: { marginTop: 8, color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600" },
});
