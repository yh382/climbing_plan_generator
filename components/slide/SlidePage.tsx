import React, { useEffect } from "react";
import { Dimensions, Pressable, StyleSheet, View, Platform } from "react-native";
import Animated, { useSharedValue, withTiming, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { BackHandler } from "react-native";

type SlideDirection = "left" | "right";

type SlidePageProps = {
  visible: boolean;
  onClose: () => void;
  direction?: SlideDirection; // "left"=从右往左滑入, "right"=从左往右滑入
  children: React.ReactNode;
  /** 点击蒙层是否关闭，默认 true */
  closeOnBackdrop?: boolean;
  /** 动画时长 ms，默认 240 */
  duration?: number;
  /** 是否显示半透明蒙层 */
  showBackdrop?: boolean;
};

const { width: W } = Dimensions.get("window");

export default function SlidePage({
  visible,
  onClose,
  direction = "left",
  children,
  closeOnBackdrop = true,
  duration = 240,
  showBackdrop = true,
}: SlidePageProps) {
  const backdrop = useSharedValue(0);
  const tx = useSharedValue(direction === "left" ? W : -W);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (visible) {
        onClose();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, { duration });
      tx.value = withTiming(0, { duration });
    } else {
      backdrop.value = withTiming(0, { duration });
      tx.value = withTiming(direction === "left" ? W : -W, { duration });
    }
  }, [visible, direction]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.6,
  }));

  const pageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View pointerEvents={visible ? "auto" : "none"} style={StyleSheet.absoluteFill}>
      {showBackdrop && (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }, backdropStyle]}>
          {/* 点击蒙层关闭 */}
          {closeOnBackdrop && (
            <Pressable onPress={onClose} style={StyleSheet.absoluteFill} accessibilityLabel="关闭滑页" />
          )}
        </Animated.View>
      )}

      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            width: W,
            backgroundColor: "#FFFFFF",
            // 阴影
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: Platform.OS === "android" ? 8 : 0,
          },
          direction === "left" ? { right: 0 } : { left: 0 },
          pageStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}
