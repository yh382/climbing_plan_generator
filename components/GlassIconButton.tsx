// src/components/GlassIconButton.tsx
import React from "react";
import {
  Pressable,
  View,
  useColorScheme,
  StyleProp,
  ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";

type GlassIconButtonProps = {
  onPress?: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode; // 一般是一个 Icon
  style?: StyleProp<ViewStyle>; // 额外外层样式（比如位置）
  size?: number; // 圆按钮直径，默认 40
  intensity?: number; // blur 强度，默认 40
};

const GlassIconButton: React.FC<GlassIconButtonProps> = ({
  onPress,
  accessibilityLabel,
  children,
  style,
  size = 40,
  intensity = 40,
}) => {
  const isDark = useColorScheme() === "dark";
  const radius = size / 2;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          borderRadius: radius,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4, // Android 阴影
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <BlurView
        tint={isDark ? "dark" : "light"}
        intensity={intensity}
        style={{
          borderRadius: radius,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark
              ? "rgba(15,23,42,0.75)"
              : "rgba(255,255,255,0.9)",
            borderWidth: 0.5,
            borderColor: isDark
              ? "rgba(148,163,184,0.5)"
              : "rgba(148,163,184,0.35)",
          }}
        >
          {children}
        </View>
      </BlurView>
    </Pressable>
  );
};

export default GlassIconButton;
