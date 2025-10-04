// components/SingleRing.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  useColorScheme,
} from "react-native";
import * as Haptics from "expo-haptics";
import Svg, { Circle, G } from "react-native-svg";

type Props = {
  // 通用
  count: number;            // 今日总次数（中间文字显示）
  modeLabel: string;        // “抱石 / 绳索”
  diameter?: number;        // 环直径
  thickness?: number;       // 轨道宽
  style?: ViewStyle;
  onPress?: () => void;

  // ——分段环（可选；给了就渲染甜甜圈）——
  total?: number;           // 当天所有等级总次数
  parts?: { grade: string; count: number }[]; // 各等级计数
  colorOf?: (g: string) => string;            // 等级颜色函数
  hideCenter?: boolean;     // 是否隐藏中心文字（默认 false）
};

export default function SingleRing({
  count,
  modeLabel,
  diameter = 180,
  thickness = 14,
  style,
  onPress,
  total,
  parts,
  colorOf,
  hideCenter = false,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const trackColor = isDark ? "#374151" : "#E5E7EB";
  const textPrimary = isDark ? "#F9FAFB" : "#111827";
  const textSecondary = isDark ? "#9CA3AF" : "#6B7280";

  const r = (diameter - thickness) / 2;
  const C = 2 * Math.PI * r;

  const hasDonut = !!(total && parts && colorOf && total > 0 && parts.length > 0);

  const RingVisual = (
    <View style={{ width: diameter, height: diameter }}>
      {/* 背景底环（浅灰） */}
      <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill}>
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="none"
        />
      </Svg>

      {/* 分段环（可选） */}
      {hasDonut && (
        <Svg width={diameter} height={diameter} style={StyleSheet.absoluteFill}>
          {/* 让起点在 12 点方向，并与旧实现一致的绘制方向 */}
          <G
            transform={`rotate(-90 ${diameter / 2} ${diameter / 2}) scale(-1,1) translate(-${diameter},0)`}
          >
            {(() => {
              let acc = 0;
              const segs = (parts || []).filter((p) => p.count > 0);
              const EPS = 1e-4;
              return segs.map((p, i) => {
                const rawLen = ((p.count || 0) / (total || 1)) * C;
                const len = i === segs.length - 1 ? Math.max(EPS, C - acc) : Math.min(rawLen, Math.max(EPS, C - acc));
                const offset = acc;
                acc += len;
                return (
                  <Circle
                    key={`donut-${p.grade}`}
                    cx={diameter / 2}
                    cy={diameter / 2}
                    r={r}
                    stroke={colorOf!(p.grade)}
                    strokeWidth={thickness}
                    strokeLinecap="butt"
                    strokeDasharray={`${len} ${Math.max(EPS, C - len)}`}
                    strokeDashoffset={-offset}
                    fill="none"
                  />
                );
              });
            })()}
          </G>
        </Svg>
      )}

    </View>
  );

  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap
      style={[styles.container, style]}
      {...(onPress
        ? {
            onPress: () => {
              Haptics.selectionAsync();
              onPress?.();
            },
          }
        : {})}
    >
      {RingVisual}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  center: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 22, fontWeight: "700" },
  modeText: { marginTop: 4, fontSize: 12, fontWeight: "600", letterSpacing: 0.2 },
});
