// src/features/profile/components/badgessection/GradeProgressionPath.tsx
// Horizontal scrollable grade progression path for Boulder and Rope.
// Each node shows a grade (e.g. V4) with two dots: Limit and Solid status.
// Connected by a line. Unlocked = tier-colored, locked = gray.

import { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import type { ThemeColors } from "@/lib/theme";
import type { Badge } from "./types";

// ── Grade definitions ──

const BOULDER_GRADES = [
  "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9",
];
const ROPE_GRADES = [
  "5_6", "5_7", "5_8", "5_9",
  "5_10a", "5_10b", "5_10c", "5_10d",
  "5_11a", "5_11b", "5_11c", "5_11d",
  "5_12a", "5_12b", "5_12c", "5_12d",
  "5_13a", "5_13b", "5_13c", "5_13d",
];

function displayGrade(code: string): string {
  // v4 → V4, 5_10a → 5.10a
  if (code.startsWith("v")) return code.toUpperCase();
  return code.replace(/_/g, ".");
}

// ── Tier colors ──

const TIER_SILVER = "#A0A0A0";
const TIER_GOLD = "#DAA520";

type NodeStatus = {
  limit: boolean;
  solid: boolean;
};

type Props = {
  badges: Badge[];
  type: "boulder" | "rope";
  tr: (zh: string, en: string) => string;
};

export default function GradeProgressionPath({ badges, type, tr }: Props) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);

  const grades = type === "boulder" ? BOULDER_GRADES : ROPE_GRADES;
  const prefix = type === "boulder" ? "boulder" : "rope";

  // Build status map from badge data
  const statusMap = useMemo(() => {
    const map = new Map<string, NodeStatus>();
    for (const g of grades) {
      const limitCode = `limit_${prefix}_${g}`;
      const solidCode = `solid_${prefix}_${g}`;
      const limitBadge = badges.find((b) => b.id === limitCode);
      const solidBadge = badges.find((b) => b.id === solidCode);
      map.set(g, {
        limit: limitBadge?.status === "unlocked",
        solid: solidBadge?.status === "unlocked",
      });
    }
    return map;
  }, [badges, grades, prefix]);

  // Find the "frontier" — the highest grade with at least one unlock
  const frontierIndex = useMemo(() => {
    let last = -1;
    for (let i = 0; i < grades.length; i++) {
      const st = statusMap.get(grades[i]);
      if (st?.limit || st?.solid) last = i;
    }
    return last;
  }, [grades, statusMap]);

  const title = type === "boulder"
    ? tr("抱石进阶", "Boulder Progression")
    : tr("绳攀进阶", "Rope Progression");

  return (
    <View style={s.container}>
      <Text style={s.title}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {grades.map((grade, i) => {
          const st = statusMap.get(grade)!;
          const isFrontier = i === frontierIndex;
          const isPast = i <= frontierIndex;

          return (
            <View key={grade} style={s.nodeWrap}>
              {/* Connecting line (not on first node) */}
              {i > 0 && (
                <View
                  style={[
                    s.line,
                    { backgroundColor: isPast ? TIER_SILVER : colors.border },
                  ]}
                />
              )}

              {/* Node */}
              <View style={[s.node, isFrontier && s.frontierNode]}>
                {/* Grade label */}
                <Text
                  style={[
                    s.gradeLabel,
                    isPast
                      ? { color: colors.textPrimary }
                      : { color: colors.textTertiary },
                    isFrontier && { fontWeight: "800" },
                  ]}
                >
                  {displayGrade(grade)}
                </Text>

                {/* Two dots: Limit + Solid */}
                <View style={s.dotsRow}>
                  <View
                    style={[
                      s.dot,
                      st.limit
                        ? { backgroundColor: TIER_SILVER }
                        : { backgroundColor: colors.border },
                    ]}
                  />
                  <View
                    style={[
                      s.dot,
                      st.solid
                        ? { backgroundColor: TIER_GOLD }
                        : { backgroundColor: colors.border },
                    ]}
                  />
                </View>

                {/* L / S labels */}
                <View style={s.dotsRow}>
                  <Text style={[s.dotLabel, st.limit && { color: TIER_SILVER }]}>L</Text>
                  <Text style={[s.dotLabel, st.solid && { color: TIER_GOLD }]}>S</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: TIER_SILVER }]} />
          <Text style={s.legendText}>Limit</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: TIER_GOLD }]} />
          <Text style={s.legendText}>Solid</Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ──

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 10,
    },
    scrollContent: {
      paddingRight: 16,
      alignItems: "center",
    },

    nodeWrap: {
      flexDirection: "row",
      alignItems: "center",
    },
    line: {
      width: 16,
      height: 2,
      borderRadius: 1,
    },

    node: {
      alignItems: "center",
      width: 40,
    },
    frontierNode: {
      transform: [{ scale: 1.15 }],
    },

    gradeLabel: {
      fontSize: 11,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
      marginBottom: 4,
    },

    dotsRow: {
      flexDirection: "row",
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotLabel: {
      fontSize: 8,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      textAlign: "center",
      width: 8,
      marginTop: 2,
    },

    legend: {
      flexDirection: "row",
      gap: 16,
      marginTop: 10,
      paddingLeft: 4,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    legendDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    legendText: {
      fontSize: 10,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
  });
}
