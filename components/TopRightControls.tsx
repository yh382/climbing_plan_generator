import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, useColorScheme } from "react-native";
import TopDateHeader from "./TopDateHeader";
import TopStepper from "./TopStepper";


export type TopRightMode = "date" | "stepper" | "none";

type DateModeProps = {
  mode: "date";
  dateLabel: string;       // '09/27 · 周六' 或 'Sat, Sep 27'
  weekCompact?: string;    // 'W3'
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onOpenPicker?: () => void;
  canPrevDate?: boolean;
  canNextDate?: boolean;
};

type StepperModeProps = {
  mode: "stepper";
  step: number;            // 1..total
  total?: number;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  canPrevStep?: boolean;
  canNextStep?: boolean;
};

type NoneModeProps = { mode?: "none" };

export type TopRightControlsProps =
  | (DateModeProps & { style?: ViewStyle; maxWidthRatio?: number })
  | (StepperModeProps & { style?: ViewStyle; maxWidthRatio?: number })
  | (NoneModeProps & { style?: ViewStyle; maxWidthRatio?: number });

export default function TopRightControls(props: TopRightControlsProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const capsuleStyle = useMemo(
    () => [
      styles.capsule,
      {
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.08)",
      },
      props.style,
    ],
    [isDark, props.style]
  );

  if (!props || props.mode === "none" || !props.mode) return null;

  const maxWidthRatio = (props as any).maxWidthRatio ?? 0.6; // 更宽的默认占比

  if (props.mode === "date") {
    const {
      dateLabel, weekCompact, onPrevDate, onNextDate, onOpenPicker, canPrevDate, canNextDate,
    } = props;

    return (
      <View pointerEvents="box-none" style={{ width: `${maxWidthRatio * 100}%`, flexShrink: 1 }}>
        <View pointerEvents="auto" style={capsuleStyle}>
          <TopDateHeader
            embedded
            dateLabel={weekCompact ? `${dateLabel} · ${weekCompact}` : dateLabel}
            onPrev={onPrevDate}
            onNext={onNextDate}
            canPrev={canPrevDate}
            canNext={canNextDate}
            onPressCenter={onOpenPicker}
            style={styles.inner}
          />
        </View>
      </View>
    );
  }

  const { step, total, onPrevStep, onNextStep, canPrevStep, canNextStep } = props as StepperModeProps;

  return (
    <View pointerEvents="box-none" style={{ width: `${maxWidthRatio * 100}%`, flexShrink: 1 }}>
      <View pointerEvents="auto" style={capsuleStyle}>
        <TopStepper
          embedded
          step={step}
          total={total}
          onPrev={onPrevStep}
          onNext={onNextStep}
          canPrev={canPrevStep}
          canNext={canNextStep}
          style={styles.inner}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    height: 40,           // 更高一些
    borderRadius: 999,
    paddingHorizontal: 12, // 更宽一些
    justifyContent: "center",
  },
  inner: {
    minWidth: 140,        // 增大最小宽度，避免拥挤
  },
});
