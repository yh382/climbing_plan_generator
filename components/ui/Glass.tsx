import React from "react";
import { Platform, StyleProp, View, ViewStyle } from "react-native";
import { GlassView } from "expo-glass-effect";

// 你可以把这两个当成“设计系统”级别的基础组件
type BaseProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

// 胶囊：tabbar、timer、按钮背景都用它
export function GlassPill({ style, children }: BaseProps) {
  // 统一圆角（胶囊常用）
  const base: ViewStyle = {
    borderRadius: 999,
    overflow: "hidden",
  };

  // fallback：非 iOS 或非支持环境时用半透明深色（你现在项目风格也偏深）
  const fallback: ViewStyle = {
    backgroundColor: "rgba(10, 14, 24, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  };

  if (Platform.OS === "ios") {
    return (
      <GlassView
        // style: "regular" 通常适合 tabbar 背板，"clear" 更通透适合浮窗
        // 你后续可以在 props 做可配置
        style={[base, style as any]}
        glassEffectStyle="regular"
        // tintColor 可以不传，先用系统默认；等你确定整体色调再统一
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[base, fallback, style]}>
      {children}
    </View>
  );
}

// 卡片：社区卡片、sheet 顶部容器、浮层卡片可以用它
export function GlassCard({ style, children }: BaseProps) {
  const base: ViewStyle = {
    borderRadius: 20,
    overflow: "hidden",
  };

  const fallback: ViewStyle = {
    backgroundColor: "rgba(10, 14, 24, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  };

  if (Platform.OS === "ios") {
    return (
      <GlassView style={[base, style as any]} glassEffectStyle="regular">
        {children}
      </GlassView>
    );
  }

  return <View style={[base, fallback, style]}>{children}</View>;
}
