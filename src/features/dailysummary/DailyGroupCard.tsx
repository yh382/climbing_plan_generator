// src/features/dailysummary/DailyGroupCard.tsx
// One row per *date* across Activity tab + Profile recent climbs. Replaces
// the old per-session DailyLogCard so multi-session days collapse into a
// single tappable card with inline session breakdown.
//
// Window DAILY_GROUP — paired with useDailyGroupSummaries hook + the
// daily-summary detail screen (tap target).

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { format, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { getColorForGrade } from "../../../lib/gradeColors";
import { useSettings } from "../../contexts/SettingsContext";
import type { DailyGroupSummary } from "./useDailyGroupSummaries";

const MAX_INLINE_SESSIONS = 3;

type Props = {
  summary: DailyGroupSummary;
  onPress: () => void;
  /** Which feed this card is rendering in. Drives the session-row icon
   *  semantics for "mixed" sessions — in the Sessions feed a mixed day
   *  also-was-training (dumbbell); in the Training feed a mixed day
   *  also-was-climbing (climb mark). Defaults to "sessions" so existing
   *  callers stay visually identical. */
  displayContext?: "sessions" | "training";
};

function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0 && mm > 0) return `${h}h ${mm}m`;
  if (h > 0) return `${h}h`;
  return `${mm}m`;
}

export default function DailyGroupCard({
  summary,
  onPress,
  displayContext = "sessions",
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const dateLabel = format(parseISO(summary.date), "EEE · M.dd");
  const gc = getColorForGrade(summary.bestGrade);
  const visibleSessions = summary.sessions.slice(0, MAX_INLINE_SESSIONS);
  const hiddenCount = summary.sessions.length - visibleSessions.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>

      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={styles.val}>{formatMinutes(summary.totalDurationMin)}</Text>
          <Text style={styles.label}>Duration</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.val}>{summary.totalAttempts}</Text>
          <Text style={styles.label}>Attempts</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.val}>{summary.totalSends}</Text>
          <Text style={styles.label}>Sends</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <View style={styles.gradeRow}>
            {summary.bestGrade !== "—" && (
              <View style={[styles.gradeDot, { backgroundColor: gc }]} />
            )}
            <Text style={styles.val}>{summary.bestGrade}</Text>
          </View>
          <Text style={styles.label}>Best</Text>
        </View>
      </View>

      {summary.sessions.length > 1 && (
        <>
          <View style={styles.rule} />
          <View style={styles.sessionList}>
            {visibleSessions.map((s, idx) => {
              const start = format(parseISO(s.startTime), "HH:mm");
              const end = format(parseISO(s.endTime), "HH:mm");
              // Session-level type icon — context-aware so the user
              // sees the *other* side of a mixed session at a glance.
              // Defaults to "climb" when missing (sessions synced
              // pre-TR0).
              //   sessions feed:
              //     climb → climb (no surprise)
              //     mixed → barbell ("also trained this day")
              //     train → barbell (rare here but safe)
              //   training feed:
              //     train → barbell (no surprise)
              //     mixed → climb mark ("also climbed this day")
              //     climb → climb (rare here but safe)
              const stype = s.sessionType ?? "climb";
              const iconName =
                displayContext === "training"
                  ? stype === "mixed"
                    ? "trending-up-outline" // climbing mark in Training feed
                    : "barbell-outline"
                  : stype === "mixed"
                    ? "barbell-outline"     // training mark in Sessions feed
                    : stype === "train"
                      ? "barbell-outline"
                      : "trending-up-outline";
              return (
                <View key={s.id} style={styles.sessionRowWrap}>
                  <Ionicons
                    name={iconName as any}
                    size={13}
                    color={colors.textTertiary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.sessionRow} numberOfLines={1}>
                    {tr(`第 ${idx + 1} 次`, `Session ${idx + 1}`)} · {start}–{end} · {s.duration}
                  </Text>
                </View>
              );
            })}
            {hiddenCount > 0 && (
              <Text style={styles.sessionRowMuted}>
                + {hiddenCount} {tr("更多", "more")}
              </Text>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: theme.borderRadius.card,
      padding: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    dateText: {
      fontSize: 14,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    grid: { flexDirection: "row", alignItems: "center" },
    item: { flex: 1, alignItems: "center" },
    val: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: theme.fonts.monoMedium,
      color: colors.textPrimary,
    },
    label: {
      fontSize: theme.typography.caption.fontSize,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      marginTop: 2,
    },
    divider: { width: 1, height: 24, backgroundColor: colors.border },
    gradeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    gradeDot: { width: 6, height: 6, borderRadius: 3 },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 12,
    },
    sessionList: { marginTop: 8, gap: 2 },
    sessionRowWrap: {
      flexDirection: "row",
      alignItems: "center",
    },
    sessionRow: {
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
      letterSpacing: 0.2,
      flexShrink: 1,
    },
    sessionRowMuted: {
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
  });
