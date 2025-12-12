// src/features/journal/DualActivityRing.tsx
import React, { useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import Animated, { useSharedValue, withTiming, useAnimatedProps } from "react-native-reanimated";

// 动画化的 SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type GradePart = {
  grade: string;
  count: number;
  color: string;
};

type Props = {
  size?: number;
  thickness?: number;
  trainingPct: number;     // 0-100
  climbCount: number;
  climbGoal?: number;      // 默认 10
  parts: GradePart[];
  outerColor?: string;
  innerColor?: string;
  bgColor?: string;
  style?: ViewStyle;
};

export default function DualActivityRing({
  size = 160,
  thickness = 14,
  trainingPct = 0,
  climbCount = 0,
  climbGoal = 10,
  parts = [],
  outerColor = "#A5D23D",
  innerColor = "#3B82F6",
  bgColor = "#F3F4F6",
  style,
}: Props) {
  const center = size / 2;
  const gap = 4; 

  // --- 1. 外环 (训练) ---
  const rOuter = (size - thickness) / 2;
  const cOuter = 2 * Math.PI * rOuter;
  const outerProgress = Math.min(100, Math.max(0, trainingPct)) / 100;
  const outerDash = cOuter * outerProgress;

  // --- 2. 内环 (无底洞) ---
  const rInner = rOuter - thickness - gap;
  const cInner = 2 * Math.PI * rInner;
  
  const fullLoops = Math.floor(climbCount / climbGoal);
  const remainder = climbCount % climbGoal;
  
  // 颜色逻辑：覆盖效果
  let innerTrackColor = bgColor;
  let innerTrackOpacity = 1;
  let currentProgress = remainder / climbGoal;

  if (fullLoops > 0) {
      // 第二圈及以上：底轨变色且半透明，形成覆盖感
      innerTrackColor = innerColor; 
      innerTrackOpacity = 0.25; 
      
      if (remainder === 0 && climbCount > 0) currentProgress = 1;
  } else {
      if (climbCount > 0 && remainder === 0) currentProgress = 1; 
  }

  const innerDash = cInner * currentProgress;

  // 动画值
  const avOuter = useSharedValue(0);
  const avInner = useSharedValue(0);

  useEffect(() => {
    avOuter.value = withTiming(outerDash, { duration: 800 });
    avInner.value = withTiming(innerDash, { duration: 800 });
  }, [outerDash, innerDash]);

  const animatedOuterProps = useAnimatedProps(() => ({
    strokeDasharray: `${avOuter.value} ${cOuter}`,
  }));

  const animatedInnerProps = useAnimatedProps(() => ({
    strokeDasharray: `${avInner.value} ${cInner}`,
  }));

  // --- 3. 堆叠条动态宽度 ---
  // 有数据时：动态增长 (20% -> 100%)
  const barWidthPercent = Math.min(100, 20 + (climbCount * 4));

  return (
    <View style={[styles.container, { width: size }, style]}>
      <View style={{ height: size, width: size }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* 外环 */}
            <Circle cx={center} cy={center} r={rOuter} stroke={bgColor} strokeWidth={thickness} fill="none" />
            <AnimatedCircle
              cx={center} cy={center} r={rOuter}
              stroke={outerColor} strokeWidth={thickness} fill="none"
              strokeLinecap="round"
              animatedProps={animatedOuterProps}
            />

            {/* 内环 */}
            <Circle
              cx={center} cy={center} r={rInner}
              stroke={innerTrackColor} 
              strokeOpacity={innerTrackOpacity}
              strokeWidth={thickness} fill="none"
            />
            <AnimatedCircle
              cx={center} cy={center} r={rInner}
              stroke={innerColor} strokeWidth={thickness} fill="none"
              strokeLinecap="round"
              animatedProps={animatedInnerProps}
            />
          </G>
        </Svg>

        {/* 中心文字 */}
        <View style={styles.centerText}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalCount}>{climbCount}</Text>
          {trainingPct > 0 && (
            <Text style={[styles.planLabel, { color: outerColor }]}>
              Plan {Math.round(trainingPct)}%
            </Text>
          )}
        </View>
      </View>

        {/* 3. 底部堆叠条 */}
      <View style={styles.barWrapper}>
          {climbCount > 0 ? (
            // 状态 A: 有数据 -> 彩色动态条 (保持不变)
            <View style={[styles.barContainer, { width: `${barWidthPercent}%` }]}>
              <View style={styles.stackedBar}>
                {parts.map((p, i) => {
                  if (p.count === 0) return null;
                  const flexVal = p.count / climbCount;
                  return (
                    <View
                      key={p.grade}
                      style={{
                        flex: flexVal,
                        backgroundColor: p.color,
                        height: "100%",
                        marginRight: 1,
                      }}
                    />
                  );
                })}
              </View>
            </View>
          ) : (
            // [修改] 状态 B: 无数据 -> 白色长条 (带极细边框，否则看不见)
            <View 
              style={[
                styles.barContainer, 
                { 
                  width: '100%', 
                  backgroundColor: '#FFFFFF', // 改为白色
                  borderWidth: 1,             // 加边框描边
                  borderColor: '#F3F4F6',     // 极浅的灰色边框
                  borderRadius: 4 
                }
              ]} 
            />
          )}

          <View style={styles.barLabels}>
               <Text style={styles.barLabelText}>Distribution</Text>
               <Text style={styles.barLabelText}>{climbCount} sends</Text>
          </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  centerText: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  totalLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  totalCount: { fontSize: 36, fontWeight: "800", color: "#111827", lineHeight: 40 },
  planLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  
  barWrapper: {
    width: '100%',
    marginTop: 20,
    justifyContent: 'flex-start',
  },
  barContainer: {
    alignSelf: 'flex-start',
    height: 16,
  },
  stackedBar: {
    width: '100%',
    height: '100%',
    flexDirection: "row",
    borderRadius: 4,
    overflow: "hidden",
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    width: '100%'
  },
  barLabelText: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' }
});