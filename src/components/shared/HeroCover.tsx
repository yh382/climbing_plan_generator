// Unified hero cover that melts into the page background with NO banding.
//
// The banding people saw came from stacking two layers whose colors flip
// mid-gradient: a solid diagonal tint (no-image cover) UNDER a black-wash→bg
// fade. "Solid block → sudden white" always shows a seam once nothing sits on
// top of it (Profile hides it under the avatar/KPI card; event/comp don't).
//
// Fix — never flip colors mid-gradient:
//   • with image: image + a CLEAN bg-alpha fade (rgba(bg,0) → bg) on the lower
//     portion, so the bottom meets the content area seamlessly.
//   • no image: ONE linear ramp from a soft theme tint straight to bg — a single
//     continuous gradient, so there is no solid-block/seam to begin with.
import React, { useMemo } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/lib/useThemeColors";

// colors.background → "r,g,b" so the fade lands on the exact bg color (渐白 in
// light, 渐黑 in dark — never a hardcoded white/black).
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

export function HeroCover({ coverUrl }: { coverUrl: string | null }) {
  const colors = useThemeColors();
  const isDark = useColorScheme() === "dark";
  const bgRgb = useMemo(() => hexToRgb(colors.background), [colors.background]);

  if (coverUrl) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        {/* Clean bg-alpha fade — only ever the bg color, transparent→opaque, so
            the lower band melts into the content area with no color flip. */}
        <LinearGradient
          pointerEvents="none"
          colors={[`rgba(${bgRgb},0)`, `rgba(${bgRgb},0)`, `rgba(${bgRgb},0.7)`, colors.background]}
          locations={[0, 0.45, 0.8, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  // No image — a single continuous ramp from a soft theme tint to bg. Two-stop
  // linear interpolation can't band; the whole cover is one smooth gradient.
  const top = isDark ? "#2C2C2E" : "#7A9E8E";
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[top, colors.background]}
      style={StyleSheet.absoluteFill}
    />
  );
}
