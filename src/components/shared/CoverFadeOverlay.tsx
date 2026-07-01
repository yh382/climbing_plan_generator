// Seam-blend overlay — fades a cover's bottom into the page background so the
// cover joins the content below with no hard dividing line. Same recipe as the
// Profile header cover-fade (ProfileHeader.tsx): a faint dark wash up top (keeps
// white header chrome legible), then a clean alpha ramp to solid
// colors.background — the bottom band is pure bg so it meets the content area
// seamlessly. Drop as the LAST child of a fixed-height cover box (absoluteFill);
// place any floating avatars / chips ABOVE it in the parent so they stay on top.
import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/lib/useThemeColors";

// colors.background → "r,g,b" so the fade lands on the exact bg color at its
// bottom stop (渐白 in light, 渐黑 in dark — never a hardcoded white/black).
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

export function CoverFadeOverlay() {
  const colors = useThemeColors();
  const bgRgb = useMemo(() => hexToRgb(colors.background), [colors.background]);
  const fadeColors = useMemo(
    () =>
      [
        "rgba(0,0,0,0.10)",
        "rgba(0,0,0,0.10)",
        `rgba(${bgRgb},0)`,
        `rgba(${bgRgb},0.35)`,
        `rgba(${bgRgb},0.7)`,
        colors.background,
        colors.background,
      ] as const,
    [bgRgb, colors.background],
  );
  // Full-height cover (no hero clip), so keep the image crisp for most of the
  // frame and land solid bg only in the bottom ~12% seam band.
  const locations = [0, 0.5, 0.66, 0.78, 0.88, 0.96, 1] as const;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={fadeColors}
      locations={locations}
      style={StyleSheet.absoluteFill}
    />
  );
}
