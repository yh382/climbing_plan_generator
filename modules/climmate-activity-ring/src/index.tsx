import React from "react";
import { StyleSheet, Text, View, type GestureResponderEvent, type ViewStyle } from "react-native";
import { requireNativeView } from "expo";

const NativeActivityRingView = requireNativeView("ClimmateActivityRing", "ActivityRingView") as React.ComponentType<any>;
const NativeDualActivityRingView = requireNativeView("ClimmateActivityRing", "DualActivityRingView") as React.ComponentType<any>;
const NativeCalendarDayRingView = requireNativeView("ClimmateActivityRing", "CalendarDayRingView") as React.ComponentType<any>;

// ─── ActivityRing (single) ──────────────────────────────────────────────────

export type ActivityRingProps = {
  progress: number;        // 0..N (overshoot OK; native renders gradient + overlap)
  color: string;           // single base hex; native derives gradient endpoints
  bgTrackColor?: string;
  size?: number;
  thickness?: number;
};

export function ActivityRing(props: ActivityRingProps) {
  const size = props.size ?? 100;
  const thickness = props.thickness ?? 12;
  return (
    <NativeActivityRingView
      progress={Math.max(0, props.progress)}
      color={props.color}
      bgTrackColor={props.bgTrackColor ?? "rgba(0,0,0,0.08)"}
      thickness={thickness}
      style={{ width: size, height: size }}
    />
  );
}

// ─── DualActivityRing (composite: native rings + RN absoluteFill text) ──────

export type DualActivityRingProps = {
  size?: number;
  thickness?: number;
  gap?: number;
  trainingPct: number;     // 0..N as percentage (e.g. 63 for 63%); we /100 for native
  climbCount: number;
  climbGoal: number;
  outerColor: string;
  innerColor: string;
  bgTrackColor?: string;
  /** Center text shown above the native rings via absoluteFill. Set to null
   *  to hide the entire center text block (caller draws their own). */
  duration?: string;
  centerLabel?: string | null; // default 'TOTAL'; null hides it
  centerStyle?: ViewStyle;
  textColors?: {
    label?: string;
    value?: string;
    duration?: string;
  };
};

export function DualActivityRing(props: DualActivityRingProps) {
  const size = props.size ?? 140;
  const thickness = props.thickness ?? 13;
  const gap = props.gap ?? 4;
  const colors = props.textColors ?? {};
  const labelText = props.centerLabel === undefined ? "TOTAL" : props.centerLabel;
  const showCenter = labelText !== null || !!props.duration;

  return (
    <View style={{ width: size, height: size }}>
      <NativeDualActivityRingView
        trainingPct={Math.max(0, props.trainingPct) / 100}
        climbCount={props.climbCount}
        climbGoal={props.climbGoal}
        outerColor={props.outerColor}
        innerColor={props.innerColor}
        bgTrackColor={props.bgTrackColor ?? "#F7F7F7"}
        thickness={thickness}
        gap={gap}
        style={StyleSheet.absoluteFill}
      />
      {showCenter && (
        <View style={[StyleSheet.absoluteFillObject, centerWrap, props.centerStyle]}>
          {labelText !== null && (
            <Text style={[centerLabel, colors.label ? { color: colors.label } : null]}>
              {labelText}
            </Text>
          )}
          <Text style={[centerValue, colors.value ? { color: colors.value } : null]}>
            {props.climbCount}
          </Text>
          {!!props.duration && (
            <Text style={[centerDuration, colors.duration ? { color: colors.duration } : null]}>
              {props.duration}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const centerWrap: ViewStyle = { alignItems: "center", justifyContent: "center" };
const centerLabel = { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1.2, marginBottom: 2 };
const centerValue = { fontSize: 36, fontFamily: "DMSans_900Black", lineHeight: 40 };
const centerDuration = { fontSize: 12, fontWeight: "500" as const, marginTop: 2 };

// ─── CalendarDayRing (Apple Fitness stacked rings + tap event) ──────────────

export type CalendarDayRingProps = {
  dayLabel: string;
  durationMin: number;
  durationGoal?: number;          // default 60
  sendCount: number;
  sendGoal?: number;              // default 10
  planProgress: number;           // 0..100
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth?: boolean;       // default true

  // Caller computes from useThemeColors() + state, passes hex strings
  outerBaseColor: string;
  innerBaseColor: string;
  ringTrackColor: string;
  selectedBg: string;
  dayTextColor: string;
  selectedTextColor: string;
  inactiveTextColor: string;
  outsideTextColor: string;
  planDotColorComplete: string;
  planDotColorInProgress: string;
  todayDotColor: string;

  onPress?: () => void;
  size?: number;                  // default 50 (native ring is 42; 8px headroom for dot row)
};

export function CalendarDayRing(props: CalendarDayRingProps) {
  const size = props.size ?? 50;
  return (
    <NativeCalendarDayRingView
      dayLabel={props.dayLabel}
      durationMin={props.durationMin}
      durationGoal={props.durationGoal ?? 60}
      sendCount={props.sendCount}
      sendGoal={props.sendGoal ?? 10}
      planProgress={Math.max(0, props.planProgress)}
      isSelected={props.isSelected}
      isToday={props.isToday}
      isCurrentMonth={props.isCurrentMonth ?? true}
      outerBaseColor={props.outerBaseColor}
      innerBaseColor={props.innerBaseColor}
      ringTrackColor={props.ringTrackColor}
      selectedBg={props.selectedBg}
      dayTextColor={props.dayTextColor}
      selectedTextColor={props.selectedTextColor}
      inactiveTextColor={props.inactiveTextColor}
      outsideTextColor={props.outsideTextColor}
      planDotColorComplete={props.planDotColorComplete}
      planDotColorInProgress={props.planDotColorInProgress}
      todayDotColor={props.todayDotColor}
      onTap={(_evt: GestureResponderEvent) => props.onPress?.()}
      style={{ width: size, height: size }}
    />
  );
}
