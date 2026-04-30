// src/features/journal/DualActivityRing.tsx
// Apple Fitness-style dual activity ring (outer+inner, composed in one Svg).
// Ring rendering primitives moved to src/components/ui/ActivityRing.tsx
// so daily-summary and other pages can reuse a single ring.

import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Svg from "react-native-svg";
import { useThemeColors } from "../../lib/useThemeColors";
import { ActivityRingPath } from "../../components/ui/ActivityRing";

type GradePart = {
  grade: string;
  count: number;
  color: string;
};

type Props = {
  size?: number;
  thickness?: number;
  trainingPct: number; // 0-100+
  climbCount: number;
  climbGoal?: number;
  parts: GradePart[];
  outerColor?: string;
  innerColor?: string;
  bgColor?: string;
  style?: ViewStyle;
  duration?: string;
  /** Render the bottom "Distribution" grade bar. Defaults to true so existing
   *  callers (session summary, community cards) keep their original layout. */
  showDistribution?: boolean;
};

export default function DualActivityRing({
  size = 160,
  thickness = 14,
  trainingPct = 0,
  climbCount = 0,
  climbGoal = 10,
  parts = [],
  outerColor = "#A08060",
  innerColor = "#306E6F",
  bgColor,
  style,
  duration,
  showDistribution = true,
}: Props) {
  const colors = useThemeColors();
  const resolvedBgColor = bgColor ?? colors.backgroundSecondary;
  const center = size / 2;
  const gap = 4;
  const rOuter = (size - thickness) / 2;
  const rInner = rOuter - thickness - gap;

  const outerProgress = Math.max(0, trainingPct) / 100;
  const innerProgress = climbGoal > 0 ? Math.max(0, climbCount) / climbGoal : 0;

  const barWidthPercent = Math.min(100, 20 + climbCount * 4);

  return (
    <View style={[styles.container, { width: size }, style]}>
      <View style={{ height: size, width: size }}>
        <Svg width={size} height={size}>
          <ActivityRingPath
            cx={center} cy={center} r={rOuter} thickness={thickness}
            progress={outerProgress} color={outerColor} bgTrackColor={resolvedBgColor}
          />
          <ActivityRingPath
            cx={center} cy={center} r={rInner} thickness={thickness}
            progress={innerProgress} color={innerColor} bgTrackColor={resolvedBgColor}
          />
        </Svg>

        <View style={styles.centerText}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>TOTAL</Text>
          <Text style={[styles.totalCount, { color: colors.textPrimary }]}>{climbCount}</Text>
          {!!duration && (
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>{duration}</Text>
          )}
        </View>
      </View>

      {showDistribution && (
        <View style={styles.barWrapper}>
          {climbCount > 0 ? (
            <View style={[styles.barContainer, { width: `${barWidthPercent}%` }]}>
              <View style={styles.stackedBar}>
                {parts.map((p) => {
                  if (p.count === 0) return null;
                  return (
                    <View key={p.grade} style={{ flex: p.count / climbCount, backgroundColor: p.color, height: "100%", marginRight: 1 }} />
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={[styles.barContainer, { width: "100%", backgroundColor: resolvedBgColor, borderWidth: 1, borderColor: resolvedBgColor, borderRadius: 4 }]} />
          )}
          <View style={styles.barLabels}>
            <Text style={[styles.barLabelText, { color: colors.textSecondary }]}>Distribution</Text>
            <Text style={[styles.barLabelText, { color: colors.textSecondary }]}>{climbCount} sends</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  centerText: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  totalLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 1.2, marginBottom: 2 },
  totalCount: { fontSize: 36, fontFamily: "DMSans_900Black", lineHeight: 40 },
  durationLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  barWrapper: { width: "100%", marginTop: 20, justifyContent: "flex-start" },
  barContainer: { alignSelf: "flex-start", height: 16 },
  stackedBar: { width: "100%", height: "100%", flexDirection: "row", borderRadius: 4, overflow: "hidden" },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, width: "100%" },
  barLabelText: { fontSize: 10, fontWeight: "500" },
});
