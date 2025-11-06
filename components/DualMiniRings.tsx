// components/DualMiniRings.tsx
import React from "react";
import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
// ✅ 直接在 DualMiniRings 内部使用 journal 的小环组件
import { DateMiniRing } from "./DateMiniRing"; // 如果小环导出位置不同，改成你的实际导出路径/名字

type Props = {
  size?: number;            // 整体外径
  outerValue: number;       // 训练完成度 0..100（外环，绿色）
  innerValue?: number;      // 仅当 innerKind="percent" 时使用（0..100）
  outerColor?: string;
  innerColor?: string;
  track?: string;
  outerThickness?: number;
  innerThickness?: number;
  gap?: number;

  // 🔹 新增：内环渲染模式
  innerKind?: "percent" | "journal";     // "journal"=彩色分段小环
  dateKey?: string;                       // innerKind="journal" 时需要
  journalType?: "boulder" | "yds";        // journal 小环的类型，默认 boulder
};

export default function DualMiniRings({
  size = 28,
  outerValue,
  innerValue = 0,
  outerColor = "#22C55E",
  innerColor = "#0EA5E9",
  track = "rgba(0,0,0,0.12)",
  outerThickness = 2.4,
  innerThickness = 2,
  gap = 1.5,
  innerKind = "percent",
  dateKey,
  journalType = "boulder",
}: Props) {
  const clamp01 = (x: number) => Math.max(0, Math.min(100, x)) / 100;

  const mkRing = (r: number, t: number, v01: number, color: string) => {
    const c = 2 * Math.PI * r, dash = c * v01, rest = c - dash;
    return (
      <>
        {/* 轨道：即使 0% 也画，避免看起来“没有环” */}
        <Circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={t} fill="none" />
        {v01 > 0 && (
          <G originX={size/2} originY={size/2} rotation={-90} scaleX={-1}>
            {/* 正上方起点 + 逆时针 */}
            <Circle
              cx={size/2} cy={size/2} r={r}
              stroke={color} strokeWidth={t} fill="none"
              strokeDasharray={`${dash} ${rest}`} strokeLinecap="round"
            />
          </G>
        )}
      </>
    );
  };

  const rOuter = (size - outerThickness) / 2;
  const rInner = rOuter - outerThickness / 2 - gap - innerThickness / 2;

  const ov01 = clamp01(outerValue);
  const iv01 = clamp01(innerValue);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* 外环：训练完成度（绿色），0% 也有轨道 */}
        {mkRing(rOuter, outerThickness, ov01, outerColor)}
        {/* 内环：两种模式 */}
        {innerKind === "percent"
          ? mkRing(rInner, innerThickness, iv01, innerColor)
          : null}
      </Svg>

      {innerKind === "journal" && !!dateKey && (
        // ✅ 在中心叠放 journal 的彩色小环，尺寸略小于外环
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <DateMiniRing
            dateKey={dateKey}
            type={journalType}
            size={18}
            thickness={2}
            selected={false}
            onPress={() => {}}
          />
        </View>
      )}
    </View>
  );
}
