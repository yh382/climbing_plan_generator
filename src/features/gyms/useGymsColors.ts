import { useMemo } from "react";
import { Platform, useColorScheme } from "react-native";

export function useGymsColors() {
  const scheme = useColorScheme();

  const colors = useMemo(() => {
    const isDark = scheme === "dark";
    const shellBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)";
    const shellBg = isDark ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.97)";
    const shellBG = isDark ? "rgba(15,23,42,0.40)" : "rgba(255,255,255,0.60)";
    const shellBORDER = isDark ? "rgba(148,163,184,0.85)" : "rgba(148,163,184,0.30)";
    return {
      shellBg,
      shellBG,
      shellBorder,
      shellBORDER,
      iconActive: "#306E6F",
      iconInactive: isDark ? "rgba(226,232,240,0.8)" : "#94A3B8",
      iconLabel: isDark ? "rgba(226,232,240,0.95)" : "#1E293B",
      searchBg: isDark ? "rgba(30,41,59,0.88)" : "rgba(241,245,249,0.94)",
      searchPlaceholder: isDark ? "rgba(148,163,184,0.8)" : "#94A3B8",
      searchBorder: shellBorder,
      searchBorderFocus: isDark ? "rgba(59,130,246,0.55)" : "#93c5fd",
      shellShadow:
        Platform.OS === "ios"
          ? { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }
          : { elevation: 12, shadowColor: "#000" },
    };
  }, [scheme]);

  const overlayTint = scheme === "dark" ? "rgba(15,23,42,0.72)" : "rgba(248,250,252,0.82)";
  const primary = colors.iconActive;
  const primaryBg = scheme === "dark" ? "rgba(48,110,111,0.22)" : "rgba(48,110,111,0.15)";

  return { colors, overlayTint, primary, primaryBg, scheme };
}
