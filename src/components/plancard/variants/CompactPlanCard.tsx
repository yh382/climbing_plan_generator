// src/components/plancard/variants/CompactPlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { planThemeByTrainingType, sourceLabel, statusLabel } from "../PlanCard.styles";

function getRightMeta(plan: TrainingPlanCardProps["plan"]) {
  // Compact 里：优先展示状态；其次展示 week 进度或 weeks
  const cw = plan.progress?.currentWeek;
  const tw = plan.progress?.totalWeeks ?? plan.durationWeeks;

  if (plan.status === "active" && typeof cw === "number" && typeof tw === "number") {
    return `Week ${cw}/${tw}`;
  }
  if (typeof tw === "number") return `${tw} wks`;
  return statusLabel(plan.status);
}

export default function CompactPlanCard(props: TrainingPlanCardProps) {
  const { plan, handlers, display, context } = props;
  const theme = planThemeByTrainingType(plan.trainingType);

  const showSource = display?.showSourceBadge ?? false;
  const showVisibility = display?.showVisibilityBadge ?? (context === "personal"); // owner 默认可见
  const showAuthor = display?.showAuthor ?? false;

  const rightMeta = useMemo(() => getRightMeta(plan), [plan]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handlers?.onPress?.(plan)}
      style={[
        styles.card,
        { borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
        display?.compactPadding ? styles.padCompact : styles.padNormal,
      ]}
    >
      {/* left color bar */}
      <View style={[styles.colorBar, { backgroundColor: theme.bg }]} />

      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.title}>
            {plan.title}
          </Text>

          <View style={styles.rightRow}>
            <Text style={styles.rightMeta}>{rightMeta}</Text>

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
        </View>

        {/* sub row */}
        <View style={styles.subRow}>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: "#F3F4F6" }]}>
              <Text style={styles.pillText}>{statusLabel(plan.status)}</Text>
            </View>

            {showSource ? (
              <View style={[styles.pill, { backgroundColor: "#F3F4F6" }]}>
                <Text style={styles.pillText}>{sourceLabel(plan.source)}</Text>
              </View>
            ) : null}

            {showVisibility ? (
              <View style={[styles.pill, { backgroundColor: "#F3F4F6" }]}>
                <Text style={styles.pillText}>{plan.visibility === "public" ? "Public" : "Private"}</Text>
              </View>
            ) : null}
          </View>

          {showAuthor && plan.author?.authorName ? (
            <Text numberOfLines={1} style={styles.author}>
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
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  padNormal: { minHeight: 76 },
  padCompact: { minHeight: 64 },

  colorBar: { width: 10 },

  main: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { flex: 1, fontSize: 15, fontWeight: "900", color: "#111" },

  rightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rightMeta: { fontSize: 12, fontWeight: "800", color: "#6B7280" },

  menuBtn: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { fontSize: 16, fontWeight: "900", color: "#111", lineHeight: 16 },

  subRow: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "800", color: "#111827" },

  author: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
});
