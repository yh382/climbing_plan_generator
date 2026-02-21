// src/components/plancard/variants/ActivePlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { clamp01, planThemeByTrainingType, sourceLabel } from "../PlanCard.styles";

type Props = TrainingPlanCardProps & {
  style?: ViewStyle;
};

function getProgressRatio(plan: TrainingPlanCardProps["plan"]) {
  // Prefer explicit ratio
  const ratio = plan.progress?.progressRatio;
  if (typeof ratio === "number") return clamp01(ratio);

  const currentWeek = plan.progress?.currentWeek;
  const totalWeeks = plan.progress?.totalWeeks ?? plan.durationWeeks;
  if (typeof currentWeek === "number" && typeof totalWeeks === "number" && totalWeeks > 0) {
    return clamp01(currentWeek / totalWeeks);
  }

  // Sessions fallback
  const done = plan.progress?.sessionsCompleted;
  const all = plan.progress?.sessionsPlanned;
  if (typeof done === "number" && typeof all === "number" && all > 0) {
    return clamp01(done / all);
  }

  return 0;
}

export default function ActivePlanCard(props: Props) {
  const { plan, context, handlers, display, rightAccessory, style } = props;
  const theme = planThemeByTrainingType(plan.trainingType);

  const progressRatio = useMemo(() => getProgressRatio(plan), [plan]);

  const weekText = useMemo(() => {
    const cw = plan.progress?.currentWeek;
    const tw = plan.progress?.totalWeeks ?? plan.durationWeeks;
    if (typeof cw === "number" && typeof tw === "number") return `Week ${cw} / ${tw}`;
    if (typeof tw === "number") return `${tw} weeks`;
    return undefined;
  }, [plan]);

  const showSource = display?.showSourceBadge ?? false;
  const showVisibility = display?.showVisibilityBadge ?? false;

  const primary = handlers?.primaryAction;
  const primaryLabel =
    primary?.action?.label ??
    (primary?.action?.type === "continue"
      ? "Continue"
      : primary?.action?.type === "view"
        ? "View"
        : primary?.action?.type === "start"
          ? "Start"
          : primary?.action?.type === "follow"
            ? "Follow"
            : "Continue");

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handlers?.onPress?.(plan)}
      style={[
        styles.card,
        { backgroundColor: theme.bg, borderColor: theme.border },
        display?.compactPadding ? styles.compactPad : styles.normalPad,
        style,
      ]}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.pill, { backgroundColor: theme.pillBg }]}>
            <Text style={[styles.pillText, { color: theme.pillFg }]}>{context === "personal" ? "My Plan" : "Plan"}</Text>
          </View>

          {showSource ? (
            <View style={[styles.pill, { backgroundColor: theme.pillBg }]}>
              <Text style={[styles.pillText, { color: theme.pillFg }]}>{sourceLabel(plan.source)}</Text>
            </View>
          ) : null}

          {showVisibility ? (
            <View style={[styles.pill, { backgroundColor: theme.pillBg }]}>
              <Text style={[styles.pillText, { color: theme.pillFg }]}>{plan.visibility === "public" ? "Public" : "Private"}</Text>
            </View>
          ) : null}
        </View>

        {rightAccessory ? <View>{rightAccessory}</View> : null}
      </View>

      {/* Title */}
      <Text numberOfLines={2} style={[styles.title, { color: theme.fg }]}>
        {plan.title}
      </Text>

      {/* Sub row */}
      <View style={styles.subRow}>
        <Text style={[styles.subText, { color: theme.sub }]}>Active</Text>
        {weekText ? <Text style={[styles.subDot, { color: theme.sub }]}> • </Text> : null}
        {weekText ? <Text style={[styles.subText, { color: theme.sub }]}>{weekText}</Text> : null}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.14)" }]}>
        <View style={[styles.progressFill, { width: `${Math.round(progressRatio * 100)}%`, backgroundColor: "rgba(255,255,255,0.70)" }]} />
      </View>

      {/* CTA row */}
      {primary ? (
        <View style={styles.ctaRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => primary.onAction(plan)}
            style={[styles.ctaBtn, { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.18)" }]}
          >
            <Text style={[styles.ctaText, { color: "#FFFFFF" }]}>{primaryLabel}</Text>
          </TouchableOpacity>

          {handlers?.onOpenMenu ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handlers.onOpenMenu?.(plan)}
              style={[styles.menuBtn, { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.18)" }]}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 18, lineHeight: 18 }}>⋯</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  normalPad: { padding: 16 },
  compactPad: { padding: 12 },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "700" },

  title: { marginTop: 10, fontSize: 18, fontWeight: "800", lineHeight: 22 },

  subRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  subText: { fontSize: 12, fontWeight: "600" },
  subDot: { fontSize: 12, fontWeight: "700" },

  progressTrack: { height: 8, borderRadius: 999, marginTop: 12, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },

  ctaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  ctaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 1,
    alignItems: "center",
  },
  ctaText: { fontSize: 13, fontWeight: "800" },

  menuBtn: {
    marginLeft: 10,
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
