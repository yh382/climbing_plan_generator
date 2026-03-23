// src/components/shared/PostAttachmentCard.tsx

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

type RouteLogData = {
  gymName: string;
  date: string;
  sends: string;
  bestGrade: string;
  duration: string;
};

type PlanData = {
  name: string;
  totalWeeks: string;
  sessionsPerWeek: string;
  type: string;
};

type PostAttachmentCardProps =
  | { type: "routeLog"; data: RouteLogData; onPress?: () => void }
  | { type: "plan"; data: PlanData; onPress?: () => void };

function StatItem({
  value,
  label,
  mono,
}: {
  value: string;
  label: string;
  mono?: boolean;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.statItem}>
      <Text
        style={[
          styles.statValue,
          mono && { fontFamily: theme.fonts.monoMedium },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function PostAttachmentCard(props: PostAttachmentCardProps) {
  const { type, data, onPress } = props;
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
      {type === "routeLog" ? (
        <View style={styles.routeLogInner}>
          {/* Top row: location + date */}
          <View style={styles.topRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={colors.textTertiary}
            />
            <Text style={styles.gymName} numberOfLines={1}>
              {(data as RouteLogData).gymName}
            </Text>
            <Text style={styles.date}>{(data as RouteLogData).date}</Text>
          </View>

          {/* Stats row: Sends | Best | Duration */}
          <View style={styles.statsRow}>
            <StatItem value={(data as RouteLogData).sends} label="Sends" />
            <View style={styles.divider} />
            <StatItem
              value={(data as RouteLogData).bestGrade}
              label="Best"
              mono
            />
            <View style={styles.divider} />
            <StatItem
              value={(data as RouteLogData).duration}
              label="Duration"
              mono
            />
          </View>
        </View>
      ) : (
        <View style={styles.planInner}>
          {/* Left: icon */}
          <View style={styles.planIcon}>
            <Ionicons name="flash" size={18} color="#306E6F" />
          </View>

          {/* Center: info */}
          <View style={{ flex: 1 }}>
            <Text style={styles.planName} numberOfLines={1}>
              {(data as PlanData).name}
            </Text>
            <Text style={styles.planMeta}>
              {(data as PlanData).totalWeeks} weeks ·{" "}
              {(data as PlanData).sessionsPerWeek} sessions/wk ·{" "}
              {(data as PlanData).type}
            </Text>
          </View>

          {/* Right: arrow */}
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.textTertiary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    overflow: "hidden",
  },

  // RouteLog
  routeLogInner: {
    padding: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  gymName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: theme.fonts.regular,
    flex: 1,
  },
  date: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: theme.fonts.regular,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    fontFamily: theme.fonts.bold,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontFamily: theme.fonts.regular,
    marginTop: 1,
  },
  divider: {
    width: 0.5,
    height: 24,
    backgroundColor: colors.border,
  },

  // Plan
  planInner: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(48,110,111,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  planName: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  planMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
});
