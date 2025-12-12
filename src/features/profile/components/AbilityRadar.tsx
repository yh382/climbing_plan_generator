// src/features/profile/components/AbilityRadar.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { tokens } from "../../../../components/ui/Theme";

const { width } = Dimensions.get("window");
const CHART_SIZE = width * 0.7;
const CENTER = CHART_SIZE / 2;
const RADIUS = CHART_SIZE / 2 - 40; // 留出文字空间

// 定义 5 个维度
const AXES = [
  { key: "finger", label: "Finger" }, // 指力
  { key: "pull", label: "Power" },    // 拉力/爆发
  { key: "core", label: "Core" },     // 核心
  { key: "flex", label: "Flex" },     // 柔韧
  { key: "sta", label: "Stamina" },   // 耐力
];

type Props = {
  data: {
    finger: number; // 0-100
    pull: number;
    core: number;
    flex: number;
    sta: number;
  };
};

export default function AbilityRadar({ data }: Props) {
  // 计算多边形顶点的辅助函数
  const getPoint = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 100) * RADIUS;
    const x = CENTER + r * Math.cos(angle);
    const y = CENTER + r * Math.sin(angle);
    return { x, y };
  };

  // 1. 生成网格 (20%, 40%, 60%, 80%, 100%)
  const grids = [20, 40, 60, 80, 100].map((level) => {
    const points = AXES.map((_, i) => {
      const { x, y } = getPoint(level, i, AXES.length);
      return `${x},${y}`;
    }).join(" ");
    return { level, points };
  });

  // 2. 生成数据区域
  const dataPoints = AXES.map((axis, i) => {
    const val = data[axis.key as keyof typeof data] || 10; // 默认给点底分
    const { x, y } = getPoint(val, i, AXES.length);
    return `${x},${y}`;
  }).join(" ");

  // 3. 生成标签位置
  const labels = AXES.map((axis, i) => {
    // 标签稍微往外推一点 (115%)
    const { x, y } = getPoint(115, i, AXES.length); 
    return { ...axis, x, y };
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ability Radar</Text>
      <View style={styles.chartWrap}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          {/* 绘制网格 */}
          {grids.map((g) => (
            <Polygon
              key={g.level}
              points={g.points}
              stroke="#E5E7EB"
              strokeWidth="1"
              fill={g.level === 100 ? "#F9FAFB" : "none"}
            />
          ))}

          {/* 绘制轴线 */}
          {AXES.map((_, i) => {
            const { x, y } = getPoint(100, i, AXES.length);
            return (
              <Line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
              />
            );
          })}

          {/* 绘制数据区域 */}
          <Polygon
            points={dataPoints}
            fill="rgba(48, 110, 111, 0.4)" // 主题绿半透明
            stroke="#306E6F"
            strokeWidth="2"
          />

          {/* 绘制数据点 */}
          {AXES.map((axis, i) => {
            const val = data[axis.key as keyof typeof data] || 10;
            const { x, y } = getPoint(val, i, AXES.length);
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#306E6F"
                stroke="#fff"
                strokeWidth="1.5"
              />
            );
          })}

          {/* 绘制标签 */}
          {labels.map((l, i) => (
            <SvgText
              key={i}
              x={l.x}
              y={l.y + 4} // 微调垂直居中
              fontSize="11"
              fontWeight="bold"
              fill="#6B7280"
              textAnchor="middle"
            >
              {l.label}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16, // 与其他卡片对齐
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});