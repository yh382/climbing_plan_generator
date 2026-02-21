import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");

// 定义 5 个维度
const AXES = [
  { key: "finger", label: "Finger" },
  { key: "pull", label: "Power" },
  { key: "core", label: "Core" },
  { key: "flex", label: "Flex" },
  { key: "sta", label: "Stamina" },
] as const;

type Props = {
  data: {
    finger: number; // 0-100
    pull: number;
    core: number;
    flex: number;
    sta: number;
  };
  // ✅ 让它和其他卡片统一：从 ProfilePage 传入同一套 styles
  styles?: any;
  title?: string;
};

export default function AbilityRadar({ data, styles, title = "Ability Radar" }: Props) {
  // ✅ 图表尺寸：适配卡片宽度（避免顶天立地 or 太小）
  const CHART_SIZE = useMemo(() => {
    // 你底部有 floating tabbar，视觉上 0.78 比较舒服
    const candidate = SCREEN_W * 0.78;
    return Math.max(240, Math.min(340, candidate));
  }, []);

  const CENTER = CHART_SIZE / 2;
  const RADIUS = CHART_SIZE / 2 - 44; // 留文字空间

  const getPoint = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 100) * RADIUS;
    const x = CENTER + r * Math.cos(angle);
    const y = CENTER + r * Math.sin(angle);
    return { x, y };
  };

  const grids = useMemo(() => {
    return [20, 40, 60, 80, 100].map((level) => {
      const points = AXES.map((_, i) => {
        const { x, y } = getPoint(level, i, AXES.length);
        return `${x},${y}`;
      }).join(" ");
      return { level, points };
    });
  }, [CHART_SIZE]);

  const dataPoints = useMemo(() => {
    return AXES.map((axis, i) => {
      const val = data[axis.key] ?? 10;
      const { x, y } = getPoint(val, i, AXES.length);
      return `${x},${y}`;
    }).join(" ");
  }, [data, CHART_SIZE]);

  const labels = useMemo(() => {
    return AXES.map((axis, i) => {
      const { x, y } = getPoint(116, i, AXES.length);
      return { ...axis, x, y };
    });
  }, [CHART_SIZE]);

  // ✅ 若没传 styles（比如你单独预览组件），给一个最小兜底
  const cardStyle = styles?.statCard ?? local.fallbackCard;
  const headerStyle = styles?.cardHeader ?? local.fallbackHeader;
  const titleStyle = styles?.cardTitle ?? local.fallbackTitle;

  return (
    <View style={cardStyle}>
      <View style={headerStyle}>
        <Text style={titleStyle}>{title}</Text>
      </View>

      <View style={local.chartWrap}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          {/* 网格 */}
          {grids.map((g) => (
            <Polygon
              key={g.level}
              points={g.points}
              stroke="#E5E7EB"
              strokeWidth="1"
              fill={g.level === 100 ? "#F9FAFB" : "none"}
            />
          ))}

          {/* 轴线 */}
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

          {/* 数据区域 */}
          <Polygon points={dataPoints} fill="rgba(48, 110, 111, 0.4)" stroke="#306E6F" strokeWidth="2" />

          {/* 数据点 */}
          {AXES.map((axis, i) => {
            const val = data[axis.key] ?? 10;
            const { x, y } = getPoint(val, i, AXES.length);
            return (
              <Circle key={i} cx={x} cy={y} r="4" fill="#306E6F" stroke="#fff" strokeWidth="1.5" />
            );
          })}

          {/* 标签 */}
          {labels.map((l, i) => (
            <SvgText
              key={i}
              x={l.x}
              y={l.y + 4}
              fontSize="11"
              fontWeight="700"
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

const local = StyleSheet.create({
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 2,
  },

  // ---- fallback styles (only used if styles not provided) ----
  fallbackCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  fallbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
});
