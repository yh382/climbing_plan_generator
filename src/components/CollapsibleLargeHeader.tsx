// src/components/CollapsibleLargeHeader.tsx
import React, { ReactNode } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

type Props = {
  largeTitle: ReactNode;
  subtitle?: ReactNode;

  smallTitle: ReactNode;

  leftActions?: ReactNode;
  rightActions?: ReactNode;

  leftSlotWidth?: number;
  rightSlotWidth?: number;

  threshold?: number;
  headerHeight?: number;
  backgroundColor?: string;
  bottomInsetExtra?: number;
  scrollViewProps?: Omit<ScrollViewProps, "onScroll">;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;

  /** ✅ 是否禁用 "大标题渐隐 / 小标题浮现" 动画效果
   * true：小标题常驻显示，大标题仅跟随滚动
   */
  disableSnapEffect?: boolean;
};

export default function CollapsibleLargeHeader({
  largeTitle,
  subtitle,
  smallTitle,
  leftActions,
  rightActions,
  leftSlotWidth = 80,
  rightSlotWidth = 80,
  threshold = 40,
  headerHeight = 44,
  backgroundColor = "#FFFFFF",
  bottomInsetExtra = 0,
  scrollViewProps,
  contentContainerStyle,
  children,
  disableSnapEffect = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerBlurStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, threshold], [0, 1], Extrapolate.CLAMP),
    };
  });

  const headerTitleStyle = useAnimatedStyle(() => {
    if (disableSnapEffect) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }
    return {
      opacity: interpolate(scrollY.value, [threshold - 10, threshold + 10], [0, 1], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollY.value, [threshold - 10, threshold + 10], [10, 0], Extrapolate.CLAMP),
        },
      ],
    };
  });

  const bigTitleStyle = useAnimatedStyle(() => {
    if (disableSnapEffect) {
      return { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] };
    }
    return {
      opacity: interpolate(scrollY.value, [0, threshold], [1, 0], Extrapolate.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, threshold], [1, 0.92], Extrapolate.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, threshold], [0, -10], Extrapolate.CLAMP) },
      ],
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {/* --- Fixed Animated Header --- */}
      <View style={[styles.fixedHeader, { height: insets.top + headerHeight }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          {/* left slot */}
          <View style={[styles.leftSlot, { width: leftSlotWidth }]}>{leftActions}</View>

          {/* center small title */}
          <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
            {typeof smallTitle === "string" ? <Text style={styles.headerTitleText}>{smallTitle}</Text> : smallTitle}
          </Animated.View>

          {/* right slot */}
          <View style={[styles.rightSlot, { width: rightSlotWidth }]}>
            <View style={styles.headerRightRow}>{rightActions}</View>
          </View>
        </View>
      </View>

      {/* --- Scroll Content --- */}
      <Animated.ScrollView
        {...(scrollViewProps as any)}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + bottomInsetExtra + 100,
        }}
      >
        {/* Large title */}
        <View style={styles.bigTitleRow}>
          <Animated.View style={[styles.bigHeaderArea, bigTitleStyle]}>
            {largeTitle}
            {subtitle ? <View style={{ marginTop: 2 }}>{subtitle}</View> : null}
          </Animated.View>
          <View style={{ width: rightSlotWidth }} />
        </View>

        <View style={[styles.contentWrapper, contentContainerStyle]}>{children}</View>
      </Animated.ScrollView>
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
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
  },
  leftSlot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
    justifyContent: "center",
    height: "100%",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bigTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 3,
  },
  bigHeaderArea: { flex: 1 },
  contentWrapper: {
    width: "100%",
  },
});
