// src/features/profile/components/fivecorefunction/ActivitySkeleton.tsx
// Window BG-FU — placeholder skeletons for Profile Activity sub-sections.
//
// Rendered by `ActivityFeedSection` only when the polymorphic post
// cache (`userActivityByUserId[userId]`) is `undefined` — i.e. truly
// first fetch where there's no shape to render yet. Once the cache row
// exists (even loading + empty items), the real sub-section components
// take over and show their own empty / loading state.
//
// Matches the real sub-sections' layout pixel-for-pixel so the bar
// doesn't jump when data arrives:
//   - MediaGridSkeleton: 6 cells, 3×2, same paddingHorizontal:16 / gap:4
//     / cellSize derived from screen width as ProfileMediaGrid does
//   - SessionListSkeleton: 3 cards, same horizontal margin:12 +
//     paddingHorizontal:14 + paddingVertical:12 + borderRadius:14 +
//     marginBottom:8 + height ~64pt (title row + KPI text row)
//
// Animation: subtle opacity pulse 0.4 ↔ 0.7 over 1.2s using the RN
// built-in `Animated` API — no reanimated worklet (less CPU on low-end
// devices than a shimmer gradient). Single Animated.Value driving all
// placeholder views in sync.

import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from "react-native";

import { useThemeColors } from "@/lib/useThemeColors";

const MEDIA_COLS = 3;
const MEDIA_GAP = 4;
const MEDIA_SIDE_PADDING = 16;
const MEDIA_COUNT = 6;
const SESSION_COUNT = 3;

function usePulseValue() {
  const value = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 0.7,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);
  return value;
}

export function MediaGridSkeleton() {
  const colors = useThemeColors();
  const opacity = usePulseValue();
  const styles = useMemo(() => createMediaStyles(colors), [colors]);

  const cells = Array.from({ length: MEDIA_COUNT });

  return (
    <View style={styles.grid}>
      {cells.map((_, i) => (
        <Animated.View key={i} style={[styles.cell, { opacity }]} />
      ))}
    </View>
  );
}

export function SessionListSkeleton() {
  const colors = useThemeColors();
  const opacity = usePulseValue();
  const styles = useMemo(() => createSessionStyles(colors), [colors]);

  const cards = Array.from({ length: SESSION_COUNT });

  return (
    <View>
      {cards.map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]} />
      ))}
    </View>
  );
}

const createMediaStyles = (colors: ReturnType<typeof useThemeColors>) => {
  const screenWidth = Dimensions.get("window").width;
  const cellSize = Math.floor(
    (screenWidth - MEDIA_SIDE_PADDING * 2 - MEDIA_GAP * (MEDIA_COLS - 1)) /
      MEDIA_COLS,
  );
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: MEDIA_SIDE_PADDING,
      gap: MEDIA_GAP,
    },
    cell: {
      width: cellSize,
      height: cellSize,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
    },
  });
};

const createSessionStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      // Match MiniSessionCard exactly so the bar doesn't shift when the
      // skeleton swaps out for the real card.
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
      // Approximate MiniSessionCard rendered height: titleRow ~16pt +
      // gap 8pt + subText ~17pt + gap 8pt + kpiRow ~18pt + vertical
      // padding 12*2 = 24pt → ~85-90pt total. Use a tight fixed height
      // to avoid measuring at runtime.
      height: 86,
    },
  });
