// Vertical grade pyramid card body — RN flexbox, horizontal ScrollView so the
// pyramid can extend beyond screen width for users who have logged the highest
// grades. Reuses buildFixedGradePyramid (highest-first) and reverses for the
// V0 → V15 / 5.6 → 5.15 left-to-right reading order.

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

import { buildFixedGradePyramid } from "@/services/stats/gradeAnalyzer";
import type { LogEntry, LogType } from "@/services/stats/types";

const BAR_WIDTH = 28;
const BAR_GAP = 8;
const MAX_BAR_HEIGHT = 80;
const CARD_HEIGHT = 120;

interface Props {
  logs: LogEntry[];
  type: LogType;
}

export default function VerticalGradePyramid({ logs, type }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // buildFixedGradePyramid returns highest-first; we want left-to-right
  // ascending so reverse a slice (toReversed isn't available pre-ES2023 RT).
  const grades = useMemo(
    () => buildFixedGradePyramid(logs, type).slice().reverse(),
    [logs, type],
  );

  const maxCount = useMemo(
    () => grades.reduce((m, g) => (g.count > m ? g.count : m), 0),
    [grades],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.row}>
        {grades.map((g) => {
          const ratio = maxCount > 0 ? g.count / maxCount : 0;
          // Reserve 1pt for the empty hairline so V0 etc. still register.
          const barHeight = g.count > 0 ? Math.max(2, ratio * MAX_BAR_HEIGHT) : 1;
          return (
            <View key={g.grade} style={styles.col}>
              <Text style={styles.count}>{g.count}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: g.count > 0 ? g.color : colors.divider,
                    },
                  ]}
                />
              </View>
              <Text style={styles.label} numberOfLines={1}>{g.grade}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 4,
      paddingVertical: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: BAR_GAP,
      height: CARD_HEIGHT,
    },
    col: {
      width: BAR_WIDTH,
      alignItems: "center",
      justifyContent: "flex-end",
      height: CARD_HEIGHT,
    },
    barTrack: {
      width: BAR_WIDTH,
      height: MAX_BAR_HEIGHT,
      justifyContent: "flex-end",
      alignItems: "stretch",
    },
    bar: {
      width: BAR_WIDTH,
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
    },
    count: {
      fontSize: 11,
      fontFamily: theme.fonts.monoRegular,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    label: {
      fontSize: 10,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
