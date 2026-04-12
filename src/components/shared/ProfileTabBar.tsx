// src/components/shared/ProfileTabBar.tsx

import React, { useMemo, useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  interpolateColor,
  SharedValue,
} from "react-native-reanimated";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const PROFILE_TABS = [
  { key: "posts", icon: "grid-outline", iconActive: "grid" },
  { key: "stats", icon: "stats-chart-outline", iconActive: "stats-chart" },
  { key: "badges", icon: "ribbon-outline", iconActive: "ribbon" },
] as const;

const TAB_COUNT = PROFILE_TABS.length;

export interface ProfileTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  scrollPosition?: SharedValue<number>;
}

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

function TabIcon({
  tab,
  index,
  scrollPosition,
  activeColor,
  inactiveColor,
  onPress,
}: {
  tab: (typeof PROFILE_TABS)[number];
  index: number;
  scrollPosition: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}) {
  const animatedColor = useAnimatedStyle(() => {
    const color = interpolateColor(
      scrollPosition.value,
      [index - 1, index, index + 1],
      [inactiveColor, activeColor, inactiveColor],
    );
    return { color };
  });

  return (
    <TouchableOpacity
      style={styles_static.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <AnimatedIonicons
        // @ts-ignore — icon union type
        name={tab.iconActive}
        size={22}
        style={animatedColor}
      />
    </TouchableOpacity>
  );
}

export default function ProfileTabBar({ activeTab, onTabPress, scrollPosition: scrollPositionProp }: ProfileTabBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Fallback shared value for when no PagerView drives scrollPosition
  const fallbackPosition = useSharedValue(PROFILE_TABS.findIndex((t) => t.key === activeTab));
  if (!scrollPositionProp) {
    const idx = PROFILE_TABS.findIndex((t) => t.key === activeTab);
    fallbackPosition.value = withTiming(idx, { duration: 250 });
  }
  const scrollPosition = scrollPositionProp ?? fallbackPosition;

  const [barWidth, setBarWidth] = useState(0);
  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  const tabWidth = barWidth / TAB_COUNT;

  const dotStyle = useAnimatedStyle(() => {
    if (tabWidth === 0) return { opacity: 0 };
    const translateX = interpolate(
      scrollPosition.value,
      [0, 1, 2],
      [tabWidth * 0.5 - 2, tabWidth * 1.5 - 2, tabWidth * 2.5 - 2],
    );
    return { transform: [{ translateX }], opacity: 1 };
  });

  return (
    <View style={styles.tabBarStickyWrap}>
      <View style={styles.tabBar} onLayout={onBarLayout}>
        {PROFILE_TABS.map((t, i) => (
          <TabIcon
            key={t.key}
            tab={t}
            index={i}
            scrollPosition={scrollPosition}
            activeColor={colors.textPrimary}
            inactiveColor={colors.textTertiary}
            onPress={() => onTabPress(t.key)}
          />
        ))}
        <Animated.View style={[styles.activeDot, dotStyle]} />
      </View>
    </View>
  );
}

const styles_static = StyleSheet.create({
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
});

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  tabBarStickyWrap: {
    backgroundColor: colors.background,
    zIndex: 20,
    elevation: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBar: { flexDirection: "row", height: 52, position: "relative" },
  activeDot: {
    position: "absolute",
    bottom: 6,
    left: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
