// src/components/shared/ProfileTabBar.tsx
// Window β — Profile KAYA: 2-segment underline (Apple Messages contact card style).
// Was 4-chip icon row (posts/stats/badges/lists) → now 2 text labels with
// animated bottom underline that follows PagerView scroll position.

import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

export const PROFILE_TABS = [
  { key: "sends", label: "Sends" },
  { key: "stats", label: "Stats & Badges" },
  { key: "lists", label: "Lists" },
] as const;

const TAB_COUNT = PROFILE_TABS.length;
const UNDERLINE_WIDTH_RATIO = 0.4; // mockup: left:30%/right:30% → 40% wide

export interface ProfileTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  scrollPosition?: SharedValue<number>;
}

export default function ProfileTabBar({
  activeTab,
  onTabPress,
  scrollPosition: scrollPositionProp,
}: ProfileTabBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const fallbackPosition = useSharedValue(
    Math.max(0, PROFILE_TABS.findIndex((t) => t.key === activeTab)),
  );
  if (!scrollPositionProp) {
    const idx = Math.max(0, PROFILE_TABS.findIndex((t) => t.key === activeTab));
    fallbackPosition.value = withTiming(idx, { duration: 250 });
  }
  const scrollPosition = scrollPositionProp ?? fallbackPosition;

  const [barWidth, setBarWidth] = useState(0);
  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  const tabWidth = barWidth / TAB_COUNT;
  const underlineWidth = tabWidth * UNDERLINE_WIDTH_RATIO;

  // Pre-compute on JS thread — Array.prototype.map can't run inside a worklet.
  const indices = useMemo(() => PROFILE_TABS.map((_, i) => i), []);
  const offsets = useMemo(
    () => PROFILE_TABS.map((_, i) => tabWidth * i + (tabWidth - underlineWidth) / 2),
    [tabWidth, underlineWidth],
  );

  const underlineStyle = useAnimatedStyle(() => {
    if (tabWidth === 0) return { opacity: 0 };
    const translateX = interpolate(scrollPosition.value, indices, offsets);
    return { transform: [{ translateX }], opacity: 1 };
  });

  return (
    <View style={styles.stickyWrap}>
      <View style={styles.bar} onLayout={onBarLayout}>
        {PROFILE_TABS.map((t) => {
          const isActive = t.key === activeTab;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.segmentItem}
              onPress={() => onTabPress(t.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.textPrimary : colors.textTertiary },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Animated.View
          style={[
            styles.underline,
            { width: underlineWidth },
            underlineStyle,
          ]}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    stickyWrap: {
      backgroundColor: colors.background,
      zIndex: 20,
      elevation: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      // No horizontal padding: segments flush to screen edges so underline +
      // border-bottom stretch full width and align with the stat-strip divider.
    },
    bar: {
      flexDirection: "row",
      height: 46,
      position: "relative",
    },
    segmentItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
    },
    underline: {
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 2,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
  });
