// src/components/ui/GlassFill.tsx
// Window BY — reusable translucent "glass" surface. Backs the Profile stats
// floating card + the Edit ghost pill (and any future glass chrome).
//
// Strategy (per BY plan §Phase 0 decision A):
//   • iOS 26+ → BlurView (frost) + a glassFill tint for a consistent bright
//     material. Future upgrade path: swap the BlurView for a SwiftUI
//     `.glassEffect()` native module (BACKLOG BY-FU-glasseffect-module).
//   • iOS < 26 → opaque glassFillSolid fill (predictable; avoids relying on a
//     weak backdrop blur — BY-spike R5 fallback).
//
// Caller passes layout (size / borderRadius / padding / absolute position) via
// `style`; GlassFill clips its fill layers to that radius (overflow hidden) and
// draws a hairline glassBorder. Children render on top.

import React from "react";
import {
  View,
  StyleSheet,
  Platform,
  useColorScheme,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { BlurView } from "expo-blur";
import { useThemeColors } from "@/lib/useThemeColors";

const IS_IOS_26 =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

export interface GlassFillProps {
  /** Layout style — size, borderRadius, padding, absolute position. */
  style?: StyleProp<ViewStyle>;
  /** BlurView intensity on iOS 26 (ignored on the solid fallback). */
  intensity?: number;
  children?: React.ReactNode;
}

export default function GlassFill({
  style,
  intensity = 30,
  children,
}: GlassFillProps) {
  const colors = useThemeColors();
  const scheme = useColorScheme();

  return (
    <View style={[styles.base, { borderColor: colors.glassBorder }, style]}>
      {IS_IOS_26 ? (
        <>
          <BlurView
            intensity={intensity}
            tint={scheme === "dark" ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.glassFill },
            ]}
            pointerEvents="none"
          />
        </>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.glassFillSolid },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
    borderWidth: 1,
  },
});
