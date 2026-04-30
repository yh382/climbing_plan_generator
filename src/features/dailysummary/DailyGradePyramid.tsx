// src/features/dailysummary/DailyGradePyramid.tsx
// Day-scoped grade pyramid: horizontal bars showing sends vs attempts per
// grade for one day only. Lightweight variant — the full analysis-page
// GradePyramid reads from store logs and is reused elsewhere.

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";

type Row = { grade: string; sends: number; attempts: number };

type Props = {
  data: Row[];
};

function vNumber(grade: string): number {
  const m = String(grade || "").match(/V(\d+)/i);
  return m ? parseInt(m[1], 10) : -1;
}

function ydsRank(grade: string): number {
  const m = String(grade || "").match(/5\.(\d+)([a-d])?/i);
  if (!m) return -1;
  const base = parseInt(m[1], 10) * 10;
  const suffix = m[2]?.toLowerCase();
  const bonus = suffix ? suffix.charCodeAt(0) - "a".charCodeAt(0) + 1 : 0;
  return base + bonus;
}

function sortGrade(a: string, b: string): number {
  const av = vNumber(a);
  const bv = vNumber(b);
  if (av >= 0 && bv >= 0) return bv - av;
  const ar = ydsRank(a);
  const br = ydsRank(b);
  if (ar >= 0 && br >= 0) return br - ar;
  return a.localeCompare(b);
}

export default function DailyGradePyramid({ data }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rows = useMemo(() => [...data].sort((a, b) => sortGrade(a.grade, b.grade)), [data]);
  const maxAttempts = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.attempts), 1),
    [rows]
  );

  if (rows.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{tr("能力金字塔", "Grade Pyramid")}</Text>
        <Text style={styles.emptyText}>{tr("今日暂无数据", "No climbs today")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{tr("能力金字塔", "Grade Pyramid")}</Text>
      <View style={{ gap: 6 }}>
        {rows.slice(0, 6).map((r) => {
          const attemptPct = (r.attempts / maxAttempts) * 100;
          const sendPct = r.attempts > 0 ? (r.sends / r.attempts) * attemptPct : 0;
          return (
            <View key={r.grade} style={styles.row}>
              <Text style={styles.grade}>{r.grade}</Text>
              <View style={styles.track}>
                <View style={[styles.barAttempts, { width: `${attemptPct}%` }]} />
                <View style={[styles.barSends, { width: `${sendPct}%` }]} />
              </View>
              <Text style={styles.count}>
                {r.sends}/{r.attempts}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 14,
      padding: 16,
      marginHorizontal: 4,
      minHeight: 140,
    },
    title: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      letterSpacing: 0.3,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      lineHeight: 18,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    grade: {
      width: 34,
      fontSize: 12,
      fontFamily: "DMMono_500Medium",
      color: colors.textPrimary,
    },
    track: {
      flex: 1,
      height: 12,
      backgroundColor: colors.background,
      borderRadius: 6,
      overflow: "hidden",
      flexDirection: "row",
    },
    barAttempts: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.border,
    },
    barSends: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.accent,
    },
    count: {
      width: 44,
      textAlign: "right",
      fontSize: 11,
      fontFamily: "DMMono_500Medium",
      color: colors.textSecondary,
    },
  });
