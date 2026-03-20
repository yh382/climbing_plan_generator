import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { scoreToGrade } from "../../lib/gradeSystem";
import type { CSMState } from "../../services/stats/csmAnalyzer";

const QUADRANT_LABELS: Record<string, { title: string; color: string }> = {
  push: { title: "Push", color: "#10B981" },
  challenge: { title: "Challenge", color: "#F59E0B" },
  develop: { title: "Develop", color: "#3B82F6" },
  rebuild: { title: "Rebuild", color: "#EF4444" },
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
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

interface Props {
  state: CSMState;
}

export default function CSMSummary({ state }: Props) {
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
          <ProgressBar value={state.lp} color="#6366F1" />
        </View>
        <View style={styles.axisItem}>
          <View style={styles.axisHeader}>
            <Text style={styles.axisLabel}>SS</Text>
            <Text style={styles.axisValue}>{state.ss.toFixed(2)}</Text>
          </View>
          <ProgressBar value={state.ss} color="#8B5CF6" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  quadrantBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  quadrantDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quadrantText: {
    fontSize: 12,
    fontWeight: "700",
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
    backgroundColor: "#E5E7EB",
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  kpiLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "600",
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
    color: "#64748B",
  },
  axisValue: {
    fontSize: 11,
    fontWeight: "600",
    color: "#374151",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
});
