import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useLogsStore from "../../store/useLogsStore";
import useActiveWorkoutStore from "../../store/useActiveWorkoutStore";
import ActiveSessionFloat from "./ActiveSessionFloat";

type Props = {
  /** 当前路由名（用于控制哪些页面不显示悬浮窗） */
  currentRouteName?: string;
  /** TabBar 高度（你这里是 60） */
  tabBarHeight?: number;
  /** 距离 TabBar 上方的额外间距 */
  offset?: number;
  /** 右侧边距（与 TabBar 胶囊对齐） */
  rightInset?: number;
  /** 额外 style，方便你未来微调 */
  style?: any;
};

export default function FloatingActiveSessionTimer({
  currentRouteName,
  tabBarHeight = 60,
  offset = 30,
  rightInset = 10,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const { activeSession } = useLogsStore();
  const { isActive: workoutActive, isMinimized: workoutMinimized } = useActiveWorkoutStore();

  const hideOn = new Set(["calendar", "coach", "journal"]);
  const hasLog = !!activeSession;
  const hasWorkout = workoutActive && workoutMinimized;
  const shouldShow = (hasLog || hasWorkout) && !hideOn.has(currentRouteName ?? "");

  if (!shouldShow) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          // ✅ 避开 home indicator + tabbar
          bottom: insets.bottom + tabBarHeight + offset,
          // ✅ 相对于“全屏坐标系”的屏幕右侧
          right: rightInset,
          zIndex: 9999,
          alignItems: "flex-end",
        },
        style,
      ]}
    >
      <ActiveSessionFloat variant="floating" />
    </View>
  );
}
