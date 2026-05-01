import React from "react";
import { type ViewStyle } from "react-native";
import { requireNativeView } from "expo";

const NativeGradePyramidView = requireNativeView(
  "ClimmateCharts",
  "GradePyramidView"
) as React.ComponentType<any>;

const NativeAbilityRadarView = requireNativeView(
  "ClimmateCharts",
  "AbilityRadarView"
) as React.ComponentType<any>;

// ─── GradePyramidNative ─────────────────────────────────────────────────────

export type GradeBarData = {
  grade: string;
  count: number;
  color: string; // hex e.g. "#306E6F" — service computes via getGradeColor
  score: number; // ordering only (highest score on top)
};

export type GradePyramidProps = {
  data: GradeBarData[];
  climbType: "boulder" | "rope";
  /** Defaults true. Set false → true (e.g. carousel swipe back) re-runs the bar expand animation. */
  isActive?: boolean;
  style?: ViewStyle;
};

// Each row gets ROW_PITCH px (bar 20pt + 10pt visual breathing room).
// Caller wraps this in ScrollView to handle rope mode overflow (~25 rows).
const ROW_PITCH = 30;
const VERTICAL_PADDING = 16;

export function GradePyramidNative({ data, climbType, isActive = true, style }: GradePyramidProps) {
  const height = data.length * ROW_PITCH + VERTICAL_PADDING;
  return (
    <NativeGradePyramidView
      data={data}
      climbType={climbType}
      isActive={isActive}
      style={[{ width: "100%", height }, style]}
    />
  );
}

// ─── AbilityRadarNative ─────────────────────────────────────────────────────

export type RadarData = {
  finger: number;
  pull: number;
  core: number;
  flex: number;
  sta: number;
};

export type AbilityRadarProps = {
  data: RadarData;
  size?: number;
};

export function AbilityRadarNative({ data, size = 240 }: AbilityRadarProps) {
  return (
    <NativeAbilityRadarView
      data={data}
      style={{ width: size, height: size }}
    />
  );
}

// ─── TrainingVolumeChartNative ──────────────────────────────────────────────

const NativeTrainingVolumeChartView = requireNativeView(
  "ClimmateCharts",
  "TrainingVolumeChartView"
) as React.ComponentType<any>;

export type VolumeSlot = {
  slotKey: string;
  label: string;
  isCurrent: boolean;
  isFuture: boolean;
  boulderEasy: number;
  boulderMid: number;
  boulderHard: number;
  boulderElite: number;
  ropeBeginner: number;
  ropeIntermediate: number;
  ropeAdvanced: number;
  ropeExpert: number;
  ropeElite: number;
  intensity: number;
};

export type TrainingVolumeChartProps = {
  slots: VolumeSlot[];
  showBoulder: boolean;
  showRope: boolean;
  /** Defaults true. Set false → true re-triggers the bars-rise animation. */
  isActive?: boolean;
  height?: number;
};

export function TrainingVolumeChartNative({
  slots,
  showBoulder,
  showRope,
  isActive = true,
  height = 260,
}: TrainingVolumeChartProps) {
  return (
    <NativeTrainingVolumeChartView
      slots={slots}
      showBoulder={showBoulder}
      showRope={showRope}
      isActive={isActive}
      style={{ width: "100%", height }}
    />
  );
}
