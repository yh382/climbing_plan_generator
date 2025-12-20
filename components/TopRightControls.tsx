import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, useColorScheme, Text, Pressable } from "react-native";
import TopStepper from "./TopStepper";

export type TopRightMode = "date" | "stepper" | "none";

type DateModeProps = {
  mode: "date";
  dateLabel: string;
  weekCompact?: string;
  onPrevDate?: () => void;
  onNextDate?: () => void;
  onOpenPicker?: () => void;
  canPrevDate?: boolean;
  canNextDate?: boolean;
};

type StepperModeProps = {
  mode: "stepper";
  step: number;
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

  const maxWidthRatio = (props as any).maxWidthRatio ?? 0.6; 

  // --- 1. 日期模式 (无箭头版) ---
  if (props.mode === "date") {
    const { dateLabel, weekCompact, onOpenPicker } = props;
    const textColor = isDark ? "#F8FAFC" : "#111827";

    return (
      // 外层容器：负责定位和穿透点击
      <View pointerEvents="box-none" style={{ flexShrink: 1 }}>
        {/* 胶囊容器：必须是 View，因为它带有 pointerEvents="auto" 用于拦截点击区域 */}
        <View pointerEvents="auto" style={capsuleStyle}>
          
          {/* 点击区域：使用 Pressable 撑满父容器 */}
          <Pressable 
            onPress={onOpenPicker}
            style={styles.dateTouchArea}
            // 移除 activeOpacity，Pressable 使用 style 回调来实现按压态（如果需要）
          >
            <Text 
              numberOfLines={1} 
              style={[styles.dateText, { color: textColor }]}
            >
              {weekCompact ? `${dateLabel} · ${weekCompact}` : dateLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- 2. 步进器模式 (保持不变) ---
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
    height: 40,
    borderRadius: 999,
    justifyContent: "center",
    overflow: 'hidden', // 确保 Pressable 的点击效果不溢出圆角
  },
  inner: {
    minWidth: 140,
  },
  dateTouchArea: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  dateText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: 'center',
  }
});