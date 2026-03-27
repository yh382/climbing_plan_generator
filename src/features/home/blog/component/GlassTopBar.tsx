import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

const DEFAULT_THRESHOLD = 40;

export function GlassTopBar({
  scrollY,
  left,
  right,
  smallTitle,
  leftSlotWidth = 88,
  rightSlotWidth = 88,
  threshold = DEFAULT_THRESHOLD,
  headerHeight = 44,
  horizontalPadding = 12,
}: {
  scrollY: SharedValue<number>;
  left: React.ReactNode;
  right?: React.ReactNode;
  smallTitle?: string;
  leftSlotWidth?: number;
  rightSlotWidth?: number;
  threshold?: number;
  headerHeight?: number;
  horizontalPadding?: number;
}) {
  const insets = useSafeAreaInsets();

  const glassOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, threshold], [0, 1], Extrapolate.CLAMP),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [threshold - 10, threshold + 10],
      [0, 1],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [threshold - 10, threshold + 10],
          [10, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  return (
    <View style={[styles.fixedHeader, { height: insets.top + headerHeight }]}>
      {/* 背景玻璃层：滚动渐显 */}
      <Animated.View
        style={[StyleSheet.absoluteFill, glassOpacity]}
        pointerEvents="none"
      >
        <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
      </Animated.View>

      {/* 内容层（按钮位置不变） */}
      <View
        style={[
          styles.headerContent,
          { marginTop: insets.top, paddingHorizontal: horizontalPadding },
        ]}
      >
        <View style={[styles.side, { width: leftSlotWidth }]}>{left}</View>

        <Animated.View style={[styles.center, titleStyle]}>
          {smallTitle ? (
            <Text style={styles.smallTitle} numberOfLines={1}>
              {smallTitle}
            </Text>
          ) : null}
        </Animated.View>

        <View
          style={[
            styles.side,
            { width: rightSlotWidth, justifyContent: "flex-end" },
          ]}
        >
          {right ?? <View style={{ width: 44, height: 44 }} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    flexDirection: "row",
    alignItems: "center",
  },
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  smallTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },

});
