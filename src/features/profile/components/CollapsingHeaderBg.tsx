// src/features/profile/components/CollapsingHeaderBg.tsx
// Window BG — Profile collapsing nav: solid-color nav-bar background that
// fades in as the user scrolls past the cover. Plugged via
// navigation.setOptions({ headerBackground }) on both profile/index.tsx
// and community/u/[id].tsx.
//
// BX (2026-06-07) — fade is driven by the `pinFadeProgress` shared value
// ProfileChromeRoot publishes from the active tab's synchronized scrollY
// (useAnimatedReaction). Progress goes 0 → 1 as the hero approaches the pin,
// so the nav reaches full opacity exactly as the tab bar pins. No measure() —
// all scroll arithmetic lives in ProfileChromeRoot.

import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { useThemeColors } from "@/lib/useThemeColors";

type Props = {
  /** 0 = bar at rest (transparent) → 1 = bar pinned (fully opaque). */
  pinFadeProgress: SharedValue<number>;
};

export default function CollapsingHeaderBg({ pinFadeProgress }: Props) {
  const colors = useThemeColors();

  const bgStyle = useAnimatedStyle(() => ({
    opacity: pinFadeProgress.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.background },
        bgStyle,
      ]}
    />
  );
}
