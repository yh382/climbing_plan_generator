import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import type { GymPlace } from "../../../../lib/poi/types";

interface GymMapAmapProps {
  gyms: GymPlace[];
  onSelectGym: (gym: GymPlace) => void;
}

/**
 * [DEFERRED] Amap (高德地图) stub — to be implemented with react-native-amap3d.
 * Priority: Low — 仅国内用户需要，当前版本使用 Google Maps。
 *
 * When implementing:
 * - Install react-native-amap3d
 * - Set Amap API key via AMapSdk.init(key)
 * - Render <MapView> with markers for gyms
 * - Fire onRegionDidChange equivalent on camera move
 */
export function GymMapAmap({ gyms: _gyms, onSelectGym: _onSelectGym }: GymMapAmapProps) {
  const scheme = useColorScheme();
  const textColor = scheme === "dark" ? "#E2E8F0" : "#0F172A";
  const bgColor = scheme === "dark" ? "#1E293B" : "#F1F5F9";

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={[styles.title, { color: textColor }]}>高德地图</Text>
      <Text style={[styles.subtitle, { color: textColor, opacity: 0.6 }]}>
        Amap integration pending — install react-native-amap3d
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center" },
});
