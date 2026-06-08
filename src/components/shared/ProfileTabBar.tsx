// src/components/shared/ProfileTabBar.tsx
// Profile sub-tab bar — iOS-native UISegmentedControl. Permanent variant
// shipped in Window BY after the BY-spike A/B 真机拍板 (native reads clean over
// the fixed-chrome bg). Replaces the former animated-underline implementation
// (see spike commit e8fb677 for the underline snapshot).
//
// scrollPosition is accepted-but-ignored for prop-shape parity: a native
// segmented control snaps discretely on change and has no swipe-progress
// affordance. PagerView swipe still drives activeTab → selectedIndex upstream,
// so the indicator snaps after a swipe settles.
//
// Window BY — opaque colors.background fill. Seamless at rest because the cover
// gradient now lands FULL bg before its clip point, so the visible cover bottom
// is the exact same bg as this bar (no transparency/blur tricks needed); opaque
// also means pinned-state scrolling content never bleeds through. The bottom
// separator is scroll-driven (pinProgress): hidden at rest so the bar dissolves
// into the cover field, visible when pinned.

import React, { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useThemeColors } from "@/lib/useThemeColors";

// Public bar height — the fixed-chrome host (ProfileChromeRoot) positions the
// PagerView content beneath the bar's resting position using this exact value.
export const PROFILE_TAB_BAR_HEIGHT = 52;

export type ProfileTabBarItem = { key: string; label: string };

export interface ProfileTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
  /** Accepted for prop-shape parity with the former underline bar; a native
   *  segmented control snaps discretely, so swipe-progress is ignored. */
  scrollPosition?: SharedValue<number>;
  /** Window BY — 0 = rest → 1 = pinned. Drives the bottom separator's opacity
   *  so the bar blends into the cover field at rest and separates from
   *  scrolling content when pinned. Defaults to a static visible line. */
  pinProgress?: SharedValue<number>;
  /** Caller-driven tab set — self + other-user both supply their own
   *  (both 3 tabs; other-user's "stats" tab shows public stats). */
  tabs?: readonly ProfileTabBarItem[];
}

const PROFILE_TABS_FALLBACK: readonly ProfileTabBarItem[] = [
  { key: "activity", label: "Activity" },
  { key: "stats", label: "Stats & Badges" },
  { key: "lists", label: "Lists" },
];

export default function ProfileTabBar({
  activeTab,
  onTabPress,
  pinProgress,
  tabs = PROFILE_TABS_FALLBACK,
}: ProfileTabBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const values = useMemo(() => tabs.map((t) => t.label), [tabs]);
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === activeTab),
  );

  const onChange = useCallback(
    (e: { nativeEvent: { selectedSegmentIndex: number } }) => {
      const idx = e.nativeEvent.selectedSegmentIndex;
      const key = tabs[idx]?.key;
      if (key) onTabPress(key);
    },
    [tabs, onTabPress],
  );

  const separatorStyle = useAnimatedStyle(() => ({
    opacity: pinProgress ? pinProgress.value : 1,
  }));

  return (
    <View style={styles.stickyWrap}>
      <View style={styles.inner}>
        <SegmentedControl
          values={values}
          selectedIndex={selectedIndex}
          onChange={onChange}
          style={styles.segmented}
        />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.separator,
          { backgroundColor: colors.border },
          separatorStyle,
        ]}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    // Opaque bg — seamless with the cover bottom (now true bg) at rest, and no
    // content bleed-through when pinned. Separator fades in via pinProgress.
    stickyWrap: {
      backgroundColor: colors.background,
      height: PROFILE_TAB_BAR_HEIGHT,
      justifyContent: "center",
      zIndex: 20,
      elevation: 20,
    },
    inner: {
      paddingHorizontal: 12,
    },
    // Full-width hairline at the bar's bottom edge; opacity scroll-driven.
    separator: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
    },
    segmented: {
      height: 40,
    },
  });
