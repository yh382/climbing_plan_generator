import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { EdgeInsets } from "react-native-safe-area-context";

interface TopGradientOverlayProps {
  insets: EdgeInsets;
  tintColor: string;
}

export function TopGradientOverlay({ insets, tintColor }: TopGradientOverlayProps) {
  return (
    <View pointerEvents="none" style={[styles.topOverlay, { height: insets.top + 12 }]}>
      <LinearGradient
        style={StyleSheet.absoluteFillObject}
        colors={[tintColor, "rgba(255, 255, 255, 0)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    overflow: "hidden",
  },
});
