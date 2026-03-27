// src/components/plancard/variants/ActivePlanCard.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Host, ContextMenu, Button } from "@expo/ui/swift-ui";
import type { TrainingPlanCardProps } from "../PlanCard.types";
import { clamp01 } from "../PlanCard.styles";
import { TRAINING_TYPE_GRADIENTS } from "../PlanCard.gradients";
import { theme } from "../../../lib/theme";

type Props = TrainingPlanCardProps & {
  style?: ViewStyle;
};

function getProgressRatio(plan: TrainingPlanCardProps["plan"]) {
  const ratio = plan.progress?.progressRatio;
  if (typeof ratio === "number") return clamp01(ratio);

  const currentWeek = plan.progress?.currentWeek;
  const totalWeeks = plan.progress?.totalWeeks ?? plan.durationWeeks;
  if (typeof currentWeek === "number" && typeof totalWeeks === "number" && totalWeeks > 0) {
    return clamp01(currentWeek / totalWeeks);
  }

  const done = plan.progress?.sessionsCompleted;
  const all = plan.progress?.sessionsPlanned;
  if (typeof done === "number" && typeof all === "number" && all > 0) {
    return clamp01(done / all);
  }

  return 0;
}

export default function ActivePlanCard(props: Props) {
  const { plan, handlers, rightAccessory, style, workoutTimer } = props;

  const progressRatio = useMemo(() => getProgressRatio(plan), [plan]);

  const weekText = useMemo(() => {
    const cw = plan.progress?.currentWeek;
    const tw = plan.progress?.totalWeeks ?? plan.durationWeeks;
    if (typeof cw === "number" && typeof tw === "number") return `Week ${cw}/${tw}`;
    if (typeof tw === "number") return `${tw} weeks`;
    return undefined;
  }, [plan]);

  const metaLine = useMemo(() => {
    const parts: string[] = [];
    const tw = plan.progress?.totalWeeks ?? plan.durationWeeks;
    if (typeof tw === "number") parts.push(`${tw} weeks`);
    const sess = plan.progress?.sessionsPlanned;
    if (typeof sess === "number" && typeof tw === "number" && tw > 0) {
      parts.push(`${Math.round(sess / tw)} sessions/wk`);
    }
    return parts.join(" · ");
  }, [plan]);

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

  const hasCover = !!plan.coverImageUri;
  const gradient = TRAINING_TYPE_GRADIENTS[plan.trainingType] ?? TRAINING_TYPE_GRADIENTS.mixed;
  const typeLabel = plan.trainingType.charAt(0).toUpperCase() + plan.trainingType.slice(1);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handlers?.onPress?.(plan)}
      style={[styles.card, style]}
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
        {/* Top row: type pill + right accessory */}
        <View style={styles.topRow}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{typeLabel}</Text>
          </View>
          {rightAccessory ? <View>{rightAccessory}</View> : null}
        </View>

        {/* Title */}
        <Text numberOfLines={2} style={styles.title}>
          {plan.title}
        </Text>

        {/* Meta line */}
        {metaLine ? (
          <Text style={styles.metaText}>{metaLine}</Text>
        ) : null}

        {/* Workout timer row (when minimized) */}
        {workoutTimer ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handlers?.onResumeWorkout?.()}
            style={styles.timerRow}
          >
            <View style={styles.liveDot} />
            <Text style={styles.timerLabel}>Training</Text>
            <Text style={styles.timerValue}>{workoutTimer}</Text>
            <View style={styles.resumePill}>
              <Text style={styles.resumeText}>Resume</Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
        </View>

        {/* Bottom row: author + status + CTA */}
        <View style={styles.bottomRow}>
          <View style={styles.bottomMeta}>
            {plan.author?.authorName ? (
              <Text style={styles.bottomMetaText}>By {plan.author.authorName}</Text>
            ) : null}
            {plan.status === "active" ? (
              <View style={styles.statusDot}>
                <View style={styles.greenDot} />
                <Text style={styles.bottomMetaText}>Active</Text>
              </View>
            ) : null}
            {weekText ? (
              <Text style={styles.bottomMetaText}>{weekText}</Text>
            ) : null}
          </View>

          {/* CTA */}
          {primary ? (
            <View style={styles.ctaRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => primary.onAction(plan)}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaText}>{primaryLabel}</Text>
              </TouchableOpacity>

              {Platform.OS === "ios" && handlers?.contextMenuItems?.length ? (
                <Host matchContents style={styles.menuBtn}>
                  <ContextMenu>
                    <ContextMenu.Trigger>
                      <Button systemImage="ellipsis" label="" />
                    </ContextMenu.Trigger>
                    <ContextMenu.Items>
                      {handlers.contextMenuItems.map((item) => (
                        <Button
                          key={item.label}
                          systemImage={item.systemImage as any}
                          role={item.role}
                          onPress={item.onPress}
                          label={item.label}
                        />
                      ))}
                    </ContextMenu.Items>
                  </ContextMenu>
                </Host>
              ) : handlers?.onOpenMenu ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => handlers.onOpenMenu?.(plan)}
                  style={styles.menuBtn}
                >
                  <Text style={styles.menuBtnText}>⋯</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 200,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  content: {
    padding: 16,
    flex: 1,
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
  title: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: theme.fonts.black,
    lineHeight: 24,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.80)",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
  bottomRow: {
    marginTop: 12,
    gap: 10,
  },
  bottomMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomMetaText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.75)",
  },
  statusDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ctaBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 18,
  },
  // Workout timer row
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.7)",
  },
  timerValue: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: theme.fonts.monoMedium,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"] as any,
    flex: 1,
  },
  resumePill: {
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  resumeText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "#FFFFFF",
  },
});
