// src/components/shared/ProfileStatsFloatingCard.tsx
// Window BY — 4-up KPI glass card hosted at the bottom of the Profile cover,
// sitting directly above the sub tab bar. Shared by self + other-user profiles.
//
// Lives inside ProfileHeader's cover region (the hero was enlarged to make
// room), so it stays within the fixed-chrome hero's visible bounds — never
// clipped by hero `overflow: hidden`, never overlapping the sub tab bar. The
// card floats over the cover's faded (渐白) bottom band.
//
// Data: B Best / R Best come from the split grade props (formerly the joined
// `gradeText`); Sends + Sessions from kpis. Missing values render "—" (e.g.
// other-user has no session count in the public profile contract).

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import GlassFill from "@/components/ui/GlassFill";

export interface ProfileStatsFloatingCardProps {
  boulderGrade?: string;
  routeGrade?: string;
  totalSends?: number;
  totalSessions?: number;
  onPress?: () => void;
  /** Positioning style supplied by the host (absolute anchor in the cover). */
  style?: StyleProp<ViewStyle>;
}

export default function ProfileStatsFloatingCard({
  boulderGrade,
  routeGrade,
  totalSends,
  totalSessions,
  onPress,
  style,
}: ProfileStatsFloatingCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cells = useMemo(
    () => [
      { key: "b", label: "B Best", value: boulderGrade ?? "—" },
      { key: "r", label: "R Best", value: routeGrade ?? "—" },
      { key: "s", label: "Sends", value: totalSends != null ? String(totalSends) : "—" },
      {
        key: "n",
        label: "Sessions",
        value: totalSessions != null ? String(totalSessions) : "—",
      },
    ],
    [boulderGrade, routeGrade, totalSends, totalSessions],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="View ascents history"
      onPress={onPress}
      disabled={!onPress}
      style={style}
    >
      <GlassFill style={styles.card} intensity={28}>
        {cells.map((c, i) => (
          <View
            key={c.key}
            style={[styles.cell, i > 0 ? styles.cellDivider : null]}
          >
            <Text style={styles.value} numberOfLines={1}>
              {c.value}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {c.label}
            </Text>
          </View>
        ))}
      </GlassFill>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 22,
      paddingVertical: 11,
      paddingHorizontal: 6,
    },
    cell: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    // Vertical hairline between cells — uses `border` (subtle dark/light) not
    // glassBorder (near-white) so it reads on the bright glass surface.
    cellDivider: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: colors.border,
    },
    value: {
      fontSize: 17,
      fontWeight: "800",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    label: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
  });
