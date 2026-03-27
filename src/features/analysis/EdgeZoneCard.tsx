import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../lib/useThemeColors";
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const maxTotalTries = Math.max(...edgeZone.grades.map((g) => g.totalTries), 1);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Edge Zone</Text>
        <Text style={styles.rangeLabel}>{lowerText} – {upperText}</Text>
      </View>

      {/* Grade bars */}
      <View style={styles.gradeList}>
        {edgeZone.grades.map((g) => {
          const pct = Math.max(8, (g.totalTries / maxTotalTries) * 100);
          const sendPct = g.totalTries > 0 ? (g.sends / g.totalTries) * 100 : 0;
          return (
            <View key={g.gradeScore} style={styles.gradeRow}>
              <Text style={styles.gradeLabel}>{g.gradeText}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barBg, { width: `${pct}%` }]}>
                  <View style={[styles.barFill, { width: `${sendPct}%` }]} />
                </View>
              </View>
              <Text style={styles.statText}>
                {g.sends}/{g.totalTries}
              </Text>
              <Text style={styles.pctText}>
                {g.avgTries > 0 ? `~${g.avgTries}t` : "—"}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Footer summary */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          CE: {Math.round(edgeZone.sendRate * 100)}%
        </Text>
        <Text style={styles.footerText}>
          QSR: {Math.round(edgeZone.qsr * 100)}%
        </Text>
        <Text style={styles.footerText}>
          PR: {Math.round(edgeZone.pr * 100)}%
        </Text>
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
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
    color: colors.chartTitle,
  },
  rangeLabel: {
    fontSize: 12,
    fontFamily: "DMMono_500Medium",
    color: colors.accent,
    backgroundColor: "rgba(48,110,111,0.1)",
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
    color: colors.chartLabel,
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: colors.progressTrack,
    borderRadius: 4,
    overflow: "hidden",
  },
  barBg: {
    height: 16,
    backgroundColor: "rgba(48,110,111,0.15)",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: 16,
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  statText: {
    width: 32,
    fontSize: 10,
    fontWeight: "600",
    color: colors.chartValue,
    textAlign: "right",
  },
  pctText: {
    width: 30,
    fontSize: 10,
    fontFamily: "DMMono_500Medium",
    color: colors.accent,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.cardBorder,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyHint: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});
