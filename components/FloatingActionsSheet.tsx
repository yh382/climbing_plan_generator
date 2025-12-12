// src/components/FloatingActionsSheet.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";

export type FloatingActionItem = {
  key: string;
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  open: boolean;
  bottomOffset: number; // 距离屏幕底部的偏移量（用来对齐 TabBar 顶部）
  sideMargin: number; // 和 TabBar 一样的左右 margin
  onClose: () => void;
  actions: FloatingActionItem[];
};

export default function FloatingActionsSheet({
  open,
  bottomOffset,
  sideMargin,
  onClose,
  actions,
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 70,
    }).start();
  }, [open, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0], // 轻轻从下往上弹
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <View
      pointerEvents={open ? "auto" : "none"}
      style={StyleSheet.absoluteFill}
    >
      {/* 半透明遮罩：点击关闭 */}
        {open && (
        <Pressable
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            onPress={onClose}
        />
        )}

      {/* 毛玻璃小面板：底边和 TabBar 顶边对齐 */}
      <Animated.View
        style={[
          styles.sheetWrapper,
          {
            left: sideMargin,
            right: sideMargin,
            bottom: bottomOffset,
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <BlurView
          tint={isDark ? "dark" : "default"}
          intensity={80}
          style={[
            styles.sheetCard,
            {
              backgroundColor: isDark
                ? "rgba(0,0,0,0.4)" // 与 TabBar 一致的 shellBg 深色
                : "rgba(255,255,255,0.2)", // 与 TabBar 一致的 shellBg 浅色
              borderColor: isDark
                ? "rgba(255,255,255,0.15)" // 与 TabBar 一致的 shellBorder 深色
                : "rgba(255,255,255,0.5)", // 与 TabBar 一致的 shellBorder 浅色
              borderWidth: 1,
            },
          ]}
        >
          {actions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => {
                action.onPress();
                onClose();
              }}
              style={({ pressed }) => [
                styles.actionRow,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons
                name={action.icon as any}
                size={20}
                color={isDark ? "#E5E7EB" : "#111827"}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.actionLabel,
                  { color: isDark ? "#E5E7EB" : "#111827" },
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(15,23,42,0.18)", // 轻微变暗
  },
  sheetWrapper: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    borderRadius: 24,
  },
  sheetCard: {
    borderRadius: 24,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
