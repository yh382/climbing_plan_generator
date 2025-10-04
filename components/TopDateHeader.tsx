import React from "react";
import { View, TouchableOpacity, StyleSheet, Text, ViewStyle, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type Props = {
  dateLabel: string;         // 已是“月日+星期”格式
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  style?: ViewStyle;
  onPressCenter?: () => void;
  /** 嵌入 TopBar 的紧凑模式 */
  embedded?: boolean;
  sideGap?: number;        // 箭头距内容容器左右边的间距
  iconTouchSize?: number;  // 箭头触控区域尺寸（保持可点击性）
};

export default function TopDateHeader({
  dateLabel,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  style,
  onPressCenter,
  embedded = false, // 默认作为嵌入内容
  sideGap = -12,      // 负值表示向外扩展
  iconTouchSize = 40,
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const textColor = isDark ? "#F8FAFC" : "#111827";
  const iconActive = "#306E6F";
  const iconDisabled = "rgba(48,110,111,0.35)";

  const content = (
    <View style={[styles.row, { paddingHorizontal: iconTouchSize + sideGap }, style]}>
      <TouchableOpacity
        onPress={() => {
          if (canPrev) { Haptics.selectionAsync(); onPrev?.(); }
          else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }
        }}
        activeOpacity={0.8}
        style={[styles.iconButton, styles.leftFix, { left: sideGap, width: iconTouchSize, height: iconTouchSize }]}
      >
        <Ionicons name="chevron-back" size={18} color={canPrev ? iconActive : iconDisabled} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => onPressCenter?.()} activeOpacity={onPressCenter ? 0.7 : 1} style={{ flexShrink: 1 }}>
        <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>{dateLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          if (canNext) { Haptics.selectionAsync(); onNext?.(); }
          else { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); }
        }}
        activeOpacity={0.8}
        style={[styles.iconButton, styles.rightFix, { right: sideGap, width: iconTouchSize, height: iconTouchSize }]}
      >
        <Ionicons name="chevron-forward" size={18} color={canNext ? iconActive : iconDisabled} />
      </TouchableOpacity>
    </View>
  );

  // 非 embedded 情况下不再占位，直接不渲染，释放给下方卡片
  if (!embedded) return null;
  return content;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    paddingHorizontal: 10,
  },
  iconButton: {
    position: "absolute",
    top: 0,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  leftFix: { left: 0 },
    rightFix: { right: 0 },
});
