// app/components/MiniRing.tsx
import React, { useMemo } from "react";
import { View, Pressable, StyleSheet, useColorScheme } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { computeRingArcs, GradeCount } from "../lib/computeRing";
import { ringStrokeColor } from "../lib/gradeColors";

type MiniRingProps = {
  segments: GradeCount[];
  size?: number;        // 外径
  thickness?: number;   // 圆环厚度
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export const MiniRing: React.FC<MiniRingProps> = ({
  segments,
  size = 24,
  thickness = 3,
  selected = false,
  onPress,
  disabled,
}) => {
  const isDark = useColorScheme() === "dark";
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * radius;

  const arcs = useMemo(() => computeRingArcs(segments), [segments]);
  const strokeBg = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const strokeBorder = ringStrokeColor(!!isDark);

  const content = (
    <Svg width={size} height={size}>
      <G rotation={-90} originX={cx} originY={cy}>
        {/* 背景圈（无记录时可见） */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={strokeBg}
          strokeWidth={thickness}
          fill="none"
        />
        {/* 扇形段：用多个 Circle + dash 绘制 */}
        {arcs.reduce<{ offset: number; nodes: React.ReactNode[] }>(
          (acc, arc, i) => {
            const len = (arc.sweep / 360) * C;
            const node = (
              <Circle
                key={i}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={arc.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={acc.offset}
                strokeLinecap="butt"
                fill="none"
              />
            );
            return { offset: acc.offset + len, nodes: [...acc.nodes, node] };
          },
          { offset: 0, nodes: [] }
        ).nodes}

        {/* 细描边提升可读性（与背景对比） */}
        {arcs.length > 0 && (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={strokeBorder}
            strokeWidth={StyleSheet.hairlineWidth}
            fill="none"
          />
        )}
      </G>
    </Svg>
  );

  // 选中态：外圈高亮（不改变内部扇形）
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.wrap,
        {
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
        },
        selected && [
          styles.selected,
          {
            borderColor: isDark ? "rgba(59,130,246,0.9)" : "rgba(59,130,246,0.8)", // blue-500
          },
        ],
      ]}
      hitSlop={8}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  selected: {
    borderWidth: 2,
  },
});
