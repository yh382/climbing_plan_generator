import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useDrawerProgress } from "@react-navigation/drawer";

const CONTENT_RADIUS = 55;
// Keep this in sync with AppDrawerContent's dim overlay so the rounded-corner
// cutout on main content always matches the visual tint of the drawer during
// the open/close animation.
const DIM_OPACITY_MAX = 0.45;

export function DrawerSceneWrapper({ children }: { children: React.ReactNode }) {
  const progress = useDrawerProgress();

  const dimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [DIM_OPACITY_MAX, 0],
      Extrapolation.CLAMP
    ),
  }));

  return (
    <View style={styles.root}>
      {/* Dim layer BEHIND the clip. At corner cutouts this tints the
          sceneStyle drawerBg to match the drawer's own animated dim. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.dimLayer, dimStyle]}
      />
      <View style={styles.clip}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  clip: {
    flex: 1,
    borderRadius: CONTENT_RADIUS,
    overflow: "hidden",
  },
  dimLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
});
