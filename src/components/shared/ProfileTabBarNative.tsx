// src/components/shared/ProfileTabBarNative.tsx
// BY-spike Item 2 — Variant B of the Profile sub-tab bar: iOS-native
// SegmentedControl pill, rendered side-by-side with the underline variant
// (ProfileTabBar.tsx) behind ProfileChromeRoot's `SUB_TAB_VARIANT` dev toggle
// for an on-device A/B. Same prop shape as ProfileTabBar so the toggle is a
// drop-in swap.
//
// scrollPosition is accepted-but-ignored: a native segmented control snaps
// discretely on change and has no swipe-progress affordance. PagerView swipe
// still works upstream — onPageSelected drives activeTab → selectedIndex here,
// so the indicator snaps after a swipe settles.
//
// spike-only: deleted (or promoted, retiring ProfileTabBar) by BY full plan.

import React, { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  PROFILE_TAB_BAR_HEIGHT,
  type ProfileTabBarItem,
  type ProfileTabBarProps,
} from "@/components/shared/ProfileTabBar";

const PROFILE_TABS_FALLBACK: readonly ProfileTabBarItem[] = [
  { key: "activity", label: "Activity" },
  { key: "stats", label: "Stats & Badges" },
  { key: "lists", label: "Lists" },
];

export default function ProfileTabBarNative({
  activeTab,
  onTabPress,
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

  return (
    <View style={styles.stickyWrap}>
      <SegmentedControl
        values={values}
        selectedIndex={selectedIndex}
        onChange={onChange}
        style={styles.segmented}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    // Mirror ProfileTabBar.stickyWrap so the fixed chrome bg + bottom hairline
    // line up identically across both variants for a fair A/B.
    stickyWrap: {
      backgroundColor: colors.background,
      height: PROFILE_TAB_BAR_HEIGHT,
      justifyContent: "center",
      zIndex: 20,
      elevation: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: 12,
    },
    segmented: {
      height: 32,
    },
  });
