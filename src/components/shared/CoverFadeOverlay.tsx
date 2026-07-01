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
  // EXACT Profile recipe: a mild dark wash up top, then a CLEAN, EVEN bg-alpha
  // ramp 0 → 1 in equal 0.25 steps over equally-spaced stops. Uneven steps or a
  // black→bg color flip mid-gradient produce a muddy grey band + a "sudden
  // coverage" jump (visible banding) — keep this linear.
  const fadeColors = useMemo(
    () =>
      [
        "rgba(0,0,0,0.10)",
        "rgba(0,0,0,0.10)",
        `rgba(${bgRgb},0)`,
        `rgba(${bgRgb},0.25)`,
        `rgba(${bgRgb},0.5)`,
        `rgba(${bgRgb},0.75)`,
        colors.background,
        colors.background,
      ] as const,
    [bgRgb, colors.background],
  );
  const locations = [0, 0.3, 0.48, 0.58, 0.68, 0.78, 0.88, 1] as const;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={fadeColors}
      locations={locations}
      style={StyleSheet.absoluteFill}
    />
  );
}
