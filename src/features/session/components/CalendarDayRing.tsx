// src/features/session/components/CalendarDayRing.tsx
import { memo } from "react";
import { TouchableOpacity, Text, View, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

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
  const outerRatio = Math.min(durationMin / durationGoal, 1);
  const innerRatio = Math.min(sendCount / sendGoal, 1);
  const outerDash = C_OUTER * outerRatio;
  const innerDash = C_INNER * innerRatio;
  const hasOuter = outerRatio > 0;
  const hasInner = innerRatio > 0;

  // Center dot: none / blue (in progress) / red (complete)
  const dotColor =
    planProgress >= 100
      ? "#EF4444"
      : planProgress > 0
        ? "#3B82F6"
        : null;

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        isSelected && styles.cellSelected,
        isToday && !isSelected && styles.cellToday,
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
                stroke="#E5E7EB"
                strokeWidth={THICKNESS}
                fill="none"
              />
            )}
            {/* Outer ring progress (green - duration) */}
            {hasOuter && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R_OUTER}
                stroke={outerRatio >= 1 ? "#10B981" : "#2BB673"}
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
                stroke="#E5E7EB"
                strokeWidth={THICKNESS}
                fill="none"
              />
            )}
            {/* Inner ring progress (blue - sends) */}
            {hasInner && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R_INNER}
                stroke={innerRatio >= 1 ? "#2563EB" : "#3B82F6"}
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
            isSelected && styles.dayTextSelected,
            !isCurrentMonth && styles.dayTextOutside,
            !hasOuter && !hasInner && isCurrentMonth && styles.dayTextInactive,
          ]}
        >
          {dayLabel}
        </Text>
      </View>

      {/* Center dot indicator for plan progress */}
      {dotColor ? (
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
  cellSelected: {
    backgroundColor: "#F3F4F6",
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "#4F46E5",
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
    color: "#374151",
  },
  dayTextSelected: {
    fontWeight: "800",
    color: "#111",
  },
  dayTextInactive: {
    color: "#9CA3AF",
  },
  dayTextOutside: {
    color: "#D1D5DB",
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
