import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../lib/useThemeColors";
import { scoreToGrade } from "../../lib/gradeSystem";
import type { CSMState } from "../../services/stats/csmAnalyzer";
import type { GradeSystem } from "../../types/climbLog";

interface AdviceTemplate {
  title: string;
  color: string;
  summary: string;
  tips: string[];
}

const TEMPLATES: Record<string, AdviceTemplate> = {
  push: {
    title: "Push",
    color: "#10B981",
    summary: "You are steadily pushing your limits! Keep your current training rhythm.",
    tips: [
      "Try more routes at {upperGrade}+ to keep progressing",
      "Maintain high send rate in your Edge Zone to solidify base",
      "Log your feel to track state changes over time",
    ],
  },
  challenge: {
    title: "Challenge",
    color: "#F59E0B",
    summary: "You are challenging hard grades but success rate is low.",
    tips: [
      "Increase volume on {lowerGrade}–{upperGrade} routes",
      "Focus on send quality over grade chasing",
      'If feel is often "hard", consider more rest days',
    ],
  },
  develop: {
    title: "Develop",
    color: "#3B82F6",
    summary: "Your send rate is strong — time to push harder!",
    tips: [
      "Start attempting {upperGrade}+ routes",
      "Increase the proportion of edge-zone-and-above climbs",
      "Set a new target grade and commit to the project",
    ],
  },
  rebuild: {
    title: "Rebuild",
    color: "#EF4444",
    summary: "Consider consolidating at lower grades to rebuild confidence.",
    tips: [
      "Focus on routes below {lowerGrade} to boost send rate",
      "Increase training frequency to accumulate volume",
      "Ensure adequate recovery — avoid training while fatigued",
    ],
  },
};

function gradeText(score: number, discipline: "boulder" | "rope"): string {
  try {
    const system: GradeSystem = discipline === "boulder" ? "vscale" : "yds";
    return scoreToGrade(Math.round(score), system);
  } catch {
    return String(Math.round(score));
  }
}

interface Props {
  state: CSMState;
}

export default function ActionAdvice({ state }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tmpl = TEMPLATES[state.quadrant] || TEMPLATES.rebuild;
  const lowerGrade = gradeText(state.edgeZone.lower, state.discipline);
  const upperGrade = gradeText(state.pi, state.discipline);

  const interpolate = (s: string) =>
    s.replace("{lowerGrade}", lowerGrade).replace("{upperGrade}", upperGrade);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Training Advice</Text>
        <View style={[styles.badge, { backgroundColor: tmpl.color + "18" }]}>
          <Text style={[styles.badgeText, { color: tmpl.color }]}>{tmpl.title}</Text>
        </View>
      </View>

      <Text style={styles.summary}>{tmpl.summary}</Text>

      <View style={styles.tipsContainer}>
        {tmpl.tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={[styles.tipDot, { backgroundColor: tmpl.color }]} />
            <Text style={styles.tipText}>{interpolate(tip)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.chartTitle,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summary: {
    fontSize: 13,
    color: colors.chartValue,
    lineHeight: 20,
    marginBottom: 14,
  },
  tipsContainer: {
    gap: 10,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: colors.chartValue,
    lineHeight: 18,
  },
});
