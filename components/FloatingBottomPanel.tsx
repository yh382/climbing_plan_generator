import React from "react";
import { View, StyleSheet, ViewStyle, Platform, useColorScheme } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 引入常量以确保严丝合缝
import { FLOATING_TAB_BAR_ICON_BUTTON_SIZE, FLOATING_TAB_BAR_BOTTOM_GAP, FLOATING_TAB_BAR_SIDE_MARGIN} from "./FloatingTabBar.constants";
// 假设你在 FloatingTabBar.tsx 里导出了这个常量，如果没有，手动写 12 也可以
// import { TAB_BAR_FLOATING_GAP } from "./FloatingTabBar"; 

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function FloatingBottomPanel({ children, style }: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const insets = useSafeAreaInsets();

  // [核心计算] 计算一楼(TabBar)占用的总高度
  // 公式：悬浮间距 + TabBar自身高度(内补+图标+底补)
  const tabBarPaddingBottom = insets.bottom > 0 ? (insets.bottom - 10) : 12;
  const tabBarHeight = FLOATING_TAB_BAR_BOTTOM_GAP + 16 + FLOATING_TAB_BAR_ICON_BUTTON_SIZE + tabBarPaddingBottom;

  const borderColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";
  const backgroundColor = isDark ? "rgba(30,41,59,0.85)" : "rgba(255,255,255,0.85)";

  return (
    <View 
      style={[
        styles.wrapper, 
        { 
          // 1. 紧贴 TabBar 顶部
          // 减去 1px 是为了盖住 TabBar 的上边框，实现完美融合（或者不减，看边框粗细）
          bottom: tabBarHeight - 1, 
          
          // 2. 阴影只在顶部显示
          shadowOpacity: isDark ? 0.3 : 0.15 
        }, 
        style
      ]}
    >
      <BlurView
        intensity={95}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.blurContainer,
          {
            backgroundColor,
            // 3. 边框逻辑：不画下边框
            borderWidth: 1,
            borderBottomWidth: 0, // [关键] 底部开口，与 TabBar 融合
            borderColor: borderColor,
          }
        ]}
      >
        <View style={styles.content}>
          {children}
        </View>
      </BlurView>
      

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    // 左右边距与 TabBar 保持一致
    left: FLOATING_TAB_BAR_SIDE_MARGIN, 
    right: FLOATING_TAB_BAR_SIDE_MARGIN,
    
    // [核心] 倒角逻辑：上圆下直
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0, // 直角
    borderBottomRightRadius: 0, // 直角
    
    // 阴影
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    elevation: 10,
    
    overflow: "visible", 
  },

  blurContainer: {
    width: "100%",
    // 匹配 wrapper 的圆角
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
});