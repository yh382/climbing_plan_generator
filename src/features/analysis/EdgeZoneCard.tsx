import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { EdgeZone } from "../../services/stats/csmAnalyzer";
import { scoreToGrade } from "../../lib/gradeSystem";
import type { GradeSystem } from "../../types/climbLog";

function gradeText(score: number, discipline: "boulder" | "rope"): string {
  try {
    const system: GradeSystem = discipline === "boulder" ? "vscale" : "yds";
    return scoreToGrade(Math.round(score), system);
  } catch {
    return String(Math.round(score));
  }
}

interface Props {
  edgeZone: EdgeZone;
  discipline: "boulder" | "rope";
  pi: number;
}

export default function EdgeZoneCard({ edgeZone, discipline, pi }: Props) {
  if (!edgeZone.sufficient) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edge Zone</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Not enough data to analyse your edge zone yet.{"\n"}
            Keep climbing to unlock this insight!
          </Text>
          <Text style={styles.emptyHint}>
            Need at least 3 logs in your edge zone.
          </Text>
        </View>
      </View>
    );
  }

  const lowerText = gradeText(edgeZone.lower, discipline);
  const upperText = gradeText(pi, discipline);
  const maxAttempts = Math.max(...edgeZone.grades.map((g) => g.attempts), 1);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Edge Zone</Text>
        <Text style={styles.rangeLabel}>{lowerText} – {upperText}</Text>
      </View>

      {/* Grade bars */}
      <View style={styles.gradeList}>
        {edgeZone.grades.map((g) => {
          const pct = Math.max(8, (g.attempts / maxAttempts) * 100);
          const sendPct = g.attempts > 0 ? (g.sends / g.attempts) * 100 : 0;
          return (
            <View key={g.gradeScore} style={styles.gradeRow}>
              <Text style={styles.gradeLabel}>{g.gradeText}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barBg, { width: `${pct}%` }]}>
                  <View style={[styles.barFill, { width: `${sendPct}%` }]} />
                </View>
              </View>
              <Text style={styles.statText}>
                {g.sends}/{g.attempts}
              </Text>
              <Text style={styles.pctText}>
                {Math.round(g.sendRate * 100)}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Footer summary */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Send rate: {Math.round(edgeZone.sendRate * 100)}%
        </Text>
        <Text style={styles.footerText}>
          Samples: {edgeZone.sampleCount}
        </Text>
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
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  gradeList: {
    gap: 8,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gradeLabel: {
    width: 38,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  barBg: {
    height: 16,
    backgroundColor: "#E0E7FF",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 16,
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  statText: {
    width: 32,
    fontSize: 10,
    fontWeight: "600",
    color: "#374151",
    textAlign: "right",
  },
  pctText: {
    width: 30,
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyHint: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});
