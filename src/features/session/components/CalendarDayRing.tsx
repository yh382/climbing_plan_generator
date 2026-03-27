// src/features/session/components/CalendarDayRing.tsx
import { memo, useMemo } from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useThemeColors } from "@/lib/useThemeColors";

const SIZE = 42;
const THICKNESS = 3;
const GAP = 1.5;

const R_OUTER = (SIZE - THICKNESS) / 2;
const C_OUTER = 2 * Math.PI * R_OUTER;

const R_INNER = R_OUTER - THICKNESS - GAP;
const C_INNER = 2 * Math.PI * R_INNER;

interface CalendarDayRingProps {
  dayLabel: string;
  durationMin: number;
  durationGoal?: number;
  sendCount: number;
  sendGoal?: number;
  planProgress: number; // 0-100
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth?: boolean;
  onPress: () => void;
}

function CalendarDayRing({
  dayLabel,
  durationMin,
  durationGoal = 120,
  sendCount,
  sendGoal = 10,
  planProgress,
  isSelected,
  isToday,
  isCurrentMonth = true,
  onPress,
}: CalendarDayRingProps) {
  const colors = useThemeColors();
  const isDark = colors.background === "#000000";

  const outerRatio = Math.min(durationMin / durationGoal, 1);
  const innerRatio = Math.min(sendCount / sendGoal, 1);
  const outerDash = C_OUTER * outerRatio;
  const innerDash = C_INNER * innerRatio;
  const hasOuter = outerRatio > 0;
  const hasInner = innerRatio > 0;

  // Center dot: none / accent (in progress) / brown (complete)
  const dotColor =
    planProgress >= 100
      ? "#A08060"
      : planProgress > 0
        ? colors.accent
        : null;

  // Ring colors adapt to selected state (accent bg)
  const ringTrackColor = isSelected
    ? "rgba(255,255,255,0.25)"
    : isDark
      ? "#38383A"
      : "#E5E7EB";
  const innerRingColor = isSelected
    ? "#FFFFFF"
    : colors.accent;
  const innerRingFullColor = isSelected
    ? "rgba(255,255,255,0.8)"
    : "#265858";

  const selectedBg = colors.accent;
  const textColor = isDark ? "#E5E7EB" : "#374151";
  const textSelectedColor = "#FFFFFF";
  const textInactiveColor = isDark ? "#48484A" : "#9CA3AF";
  const textOutsideColor = isDark ? "#38383A" : "#D1D5DB";

  // Today dot color: white on accent bg, accent on normal bg
  const todayDotColor = isSelected ? "#FFFFFF" : colors.accent;

  const dynamicStyles = useMemo(
    () => ({
      cellSelected: { backgroundColor: selectedBg },
      dayText: { color: textColor },
      dayTextSelected: { color: textSelectedColor },
      dayTextInactive: { color: textInactiveColor },
      dayTextOutside: { color: textOutsideColor },
    }),
    [isDark],
  );

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        isSelected && dynamicStyles.cellSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} originX={SIZE / 2} originY={SIZE / 2}>
            {/* Outer ring track */}
            {hasOuter && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R_OUTER}
                stroke={ringTrackColor}
                strokeWidth={THICKNESS}
                fill="none"
              />
            )}
            {/* Outer ring progress (duration) */}
            {hasOuter && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R_OUTER}
                stroke={outerRatio >= 1 ? "#8B6914" : "#A08060"}
                strokeWidth={THICKNESS}
                fill="none"
                strokeDasharray={`${outerDash} ${C_OUTER - outerDash}`}
                strokeLinecap="round"
              />
            )}
            {/* Inner ring track */}
            {hasInner && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R_INNER}
                stroke={ringTrackColor}
                strokeWidth={THICKNESS}
                fill="none"
              />
            )}
            {/* Inner ring progress (sends) */}
            {hasInner && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R_INNER}
                stroke={innerRatio >= 1 ? innerRingFullColor : innerRingColor}
                strokeWidth={THICKNESS}
                fill="none"
                strokeDasharray={`${innerDash} ${C_INNER - innerDash}`}
                strokeLinecap="round"
              />
            )}
          </G>
        </Svg>

        {/* Day number centered */}
        <Text
          style={[
            styles.dayText,
            dynamicStyles.dayText,
            isSelected && dynamicStyles.dayTextSelected,
            isSelected && styles.dayTextSelectedWeight,
            !isCurrentMonth && dynamicStyles.dayTextOutside,
            !hasOuter && !hasInner && isCurrentMonth && !isSelected && dynamicStyles.dayTextInactive,
          ]}
        >
          {dayLabel}
        </Text>
      </View>

      {/* Bottom indicator: today dot takes priority, then plan dot */}
      {isToday ? (
        <View style={[styles.todayDot, { backgroundColor: todayDotColor }]} />
      ) : dotColor ? (
        <View style={[styles.planDot, { backgroundColor: dotColor }]} />
      ) : (
        <View style={styles.dotSpacer} />
      )}
    </TouchableOpacity>
  );
}

export default memo(CalendarDayRing);

const styles = StyleSheet.create({
  cell: {
    width: "14%",
    alignItems: "center",
    marginBottom: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    position: "absolute",
    fontSize: 12,
    fontWeight: "600",
  },
  dayTextSelectedWeight: {
    fontWeight: "800",
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  planDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  dotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
