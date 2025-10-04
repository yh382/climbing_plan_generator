import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Props = {
  step: number;
  total?: number;
  canPrev?: boolean;
  canNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  style?: ViewStyle;
  embedded?: boolean;
  sideGap?: number;        // 箭头距内容容器左右边的间距
  iconTouchSize?: number;  // 箭头触控区域尺寸（保持可点击性）
};

export default function TopStepper({
  step,
  total = 4,
  canPrev = step > 1,
  canNext = step < total,
  onPrev,
  onNext,
  style,
  embedded = false, // 默认作为嵌入内容
  sideGap = -26,      // 负值表示向外扩展
  iconTouchSize = 40,
}: Props) {
  const iconActive = "#306E6F";
  const iconDisabled = "rgba(48,110,111,0.35)";

    // 替换原来的 useMemo（或在其中加入该分支逻辑）
    const dots = useMemo(() => {
    if (total <= 5) {
        return Array.from({ length: total }, (_, i) => i + 1); // 显示全部点
    }
    const range = 2;
    const start = Math.max(1, step - range);
    const end = Math.min(total, step + range);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
    }, [step, total]);


  const content = (
    <View style={[styles.row, { paddingHorizontal: iconTouchSize + sideGap }, style]}>
      <TouchableOpacity
        onPress={() => { if (canPrev) { Haptics.selectionAsync(); onPrev?.(); } else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } }}
        activeOpacity={0.8}
        style={[styles.iconButton, { left: sideGap, width: iconTouchSize, height: iconTouchSize }]}
      >
        <Ionicons name="chevron-back" size={18} color={canPrev ? iconActive : iconDisabled} />
      </TouchableOpacity>

      <View style={styles.dotsRow}>
        {dots.map((i) => {
          const active = i === step;
          return (
            <View key={i} style={{ paddingHorizontal: 3, alignItems: "center", justifyContent: "center" }}>
              {active && <View style={styles.dotHalo} />}
              <View style={[styles.dot, active ? styles.dotActive : styles.dotInactive]} />
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        onPress={() => { if (canNext) { Haptics.selectionAsync(); onNext?.(); } else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } }}
        activeOpacity={0.8}
        style={[styles.iconButton, { right: sideGap, width: iconTouchSize, height: iconTouchSize }]}
      >
        <Ionicons name="chevron-forward" size={18} color={canNext ? iconActive : iconDisabled} />
      </TouchableOpacity>
    </View>
  );

  // 非 embedded 情况下不再占位，直接不渲染
  if (!embedded) return null;
  return content;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  dotInactive: { backgroundColor: "#D1D5DB" },
  dotActive: { backgroundColor: "#000000" },
  dotHalo: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(27, 28, 32, 0.35)",
  },
});
