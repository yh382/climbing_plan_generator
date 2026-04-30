// src/features/dailysummary/RingsPage.tsx
// Left: dual concentric ring (outer=time on wall, inner=sends) — matches
// CalendarDayRing's semantics in Activity tab's month calendar.
// Right: single Tops Rate ring (sends / attempts).

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import { ActivityRing, DualActivityRing } from "../../../modules/climmate-activity-ring/src";

type Props = {
  timeOnWallMin: number;
  timeOnWallPct: number;
  topsRatePct: number;
  sends: number;
  attempts: number;
  quickLogCount: number;
};

function formatDuration(min: number): string {
  if (min <= 0) return "0m";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function RingsPage({
  timeOnWallMin,
  timeOnWallPct,
  topsRatePct,
  sends,
  attempts,
  quickLogCount,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {/* Left: Time + Sends dual ring */}
      <View style={styles.ringCell}>
        <DualActivityRing
          size={140}
          thickness={13}
          trainingPct={timeOnWallPct}
          climbCount={sends}
          climbGoal={10}
          duration={formatDuration(timeOnWallMin)}
          outerColor="#A08060"
          innerColor={colors.accent}
          bgTrackColor={colors.backgroundSecondary}
          textColors={{
            label: colors.textSecondary,
            value: colors.textPrimary,
            duration: colors.textSecondary,
          }}
        />
        <Text style={styles.label}>{tr("墙上时间 · 完攀", "TIME · SENDS")}</Text>
        <Text style={styles.sub}>
          {quickLogCount > 0
            ? tr(
                `含 ${quickLogCount} 条快速记录`,
                `incl. ${quickLogCount} quick log${quickLogCount > 1 ? "s" : ""}`,
              )
            : tr("目标 2h · 10 次", "Goal 2h · 10 sends")}
        </Text>
      </View>

      {/* Right: Tops Rate single ring — distinct earthy color from the dual
          ring's teal inner so the two don't read as one palette. */}
      <View style={styles.ringCell}>
        <View style={styles.singleRingWrap}>
          <ActivityRing
            size={140}
            thickness={13}
            progress={topsRatePct / 100}
            color={TOPS_RATE_COLOR}
            bgTrackColor={colors.backgroundSecondary}
          />
          <View style={styles.centerText}>
            <Text style={styles.centerValue}>{topsRatePct}%</Text>
          </View>
        </View>
        <Text style={styles.label}>{tr("完攀率", "TOPS RATE")}</Text>
        <Text style={styles.sub}>
          {sends} / {attempts} {tr("完成", "sends")}
        </Text>
      </View>
    </View>
  );
}

// Muted terracotta — sits between the brown `#A08060` outer and teal accent
// inner of the dual ring without blending into either.
const TOPS_RATE_COLOR = "#B5635E";

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-start",
      paddingVertical: 8,
    },
    ringCell: { alignItems: "center" },
    singleRingWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
    centerText: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
    centerValue: {
      fontSize: 28,
      fontFamily: "DMMono_500Medium",
      color: colors.textPrimary,
    },
    label: {
      marginTop: 8,
      fontSize: 11,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    sub: {
      marginTop: 2,
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
  });
