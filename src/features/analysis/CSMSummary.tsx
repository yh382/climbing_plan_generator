import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../lib/useThemeColors";
import { scoreToGrade } from "../../lib/gradeSystem";
import type { CSMState } from "../../services/stats/csmAnalyzer";
import { CSM_STATE_COLORS } from "../../lib/theme";

const QUADRANT_LABELS: Record<string, { title: string; color: string }> = {
  push:      { title: "Push",      color: CSM_STATE_COLORS.push },
  challenge: { title: "Challenge", color: CSM_STATE_COLORS.challenge },
  develop:   { title: "Develop",   color: CSM_STATE_COLORS.develop },
  rebuild:   { title: "Rebuild",   color: CSM_STATE_COLORS.rebuild },
};

function formatPI(pi: number, discipline: "boulder" | "rope"): string {
  if (discipline === "boulder") {
    const rounded = Math.round(pi);
    return `~V${rounded}`;
  }
  // rope: score → YDS text
  const rounded = Math.round(pi);
  try {
    return `~${scoreToGrade(rounded, "yds")}`;
  } catch {
    return `${pi.toFixed(1)}`;
  }
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

interface Props {
  state: CSMState;
}

export default function CSMSummary({ state }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const q = QUADRANT_LABELS[state.quadrant] || QUADRANT_LABELS.rebuild;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Training State</Text>
        <View style={[styles.quadrantBadge, { backgroundColor: q.color + "18" }]}>
          <View style={[styles.quadrantDot, { backgroundColor: q.color }]} />
          <Text style={[styles.quadrantText, { color: q.color }]}>{q.title}</Text>
        </View>
      </View>

      {/* KPI row: PI / EL / CE */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiItem}>
          <Text style={styles.kpiVal}>{formatPI(state.pi, state.discipline)}</Text>
          <Text style={styles.kpiLabel}>PI</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={styles.kpiVal}>{state.el.toFixed(2)}</Text>
          <Text style={styles.kpiLabel}>EL</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={styles.kpiVal}>{Math.round(state.ce * 100)}%</Text>
          <Text style={styles.kpiLabel}>CE</Text>
        </View>
      </View>

      {/* LP / SS bars */}
      <View style={styles.axisRow}>
        <View style={styles.axisItem}>
          <View style={styles.axisHeader}>
            <Text style={styles.axisLabel}>LP</Text>
            <Text style={styles.axisValue}>{state.lp.toFixed(2)}</Text>
          </View>
          <ProgressBar value={state.lp} color="#306E6F" />
        </View>
        <View style={styles.axisItem}>
          <View style={styles.axisHeader}>
            <Text style={styles.axisLabel}>SS</Text>
            <Text style={styles.axisValue}>{state.ss.toFixed(2)}</Text>
          </View>
          <ProgressBar value={state.ss} color="#306E6F" />
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: colors.chartTitle,
  },
  quadrantBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  quadrantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quadrantText: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
  },
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
  },
  kpiDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.divider,
  },
  kpiVal: {
    fontSize: 18,
    fontFamily: "DMMono_500Medium",
    color: colors.chartTitle,
  },
  kpiLabel: {
    fontSize: 9,
    color: colors.toggleInactiveText,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  axisRow: {
    gap: 10,
  },
  axisItem: {
    gap: 4,
  },
  axisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  axisLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.chartLabel,
  },
  axisValue: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.chartValue,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.progressTrack,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
