import React from "react";
import { Text, Pressable, View, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { GymPlace } from "../../../../lib/poi/types";
import { theme } from "../../../lib/theme";

/** Small teardrop matching the gym map marker — marks gym rows (vs the
 *  climbing-figure on crag rows). */
function GymTeardrop() {
  return (
    <Svg width={12} height={15} viewBox="0 0 32 40" style={{ marginRight: 6 }}>
      <Path
        d="M16 1.5 C 8 1.5 1.5 8 1.5 16 C 1.5 26 16 38.5 16 38.5 C 16 38.5 30.5 26 30.5 16 C 30.5 8 24 1.5 16 1.5 Z"
        fill={theme.colors.gymMarkerFill}
      />
      <Circle cx={16} cy={15.5} r={5.5} fill="#FFFFFF" />
    </Svg>
  );
}

interface GymListItemProps {
  gym: GymPlace;
  onPress: () => void;
  colors: {
    iconLabel: string;
    iconInactive: string;
  };
}

export function GymListItem({ gym, onPress, colors }: GymListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={styles.rowItem}
    >
      <View style={styles.titleRow}>
        <GymTeardrop />
        <Text style={[styles.rowTitle, { color: colors.iconLabel }]} numberOfLines={1}>
          {gym.name}
        </Text>
      </View>
      {gym.distance_m != null && (
        <Text style={[styles.rowMeta, { color: colors.iconInactive }]} numberOfLines={1}>
          {gym.distance_m < 1000 ? `${Math.round(gym.distance_m)} m` : `${(gym.distance_m / 1000).toFixed(1)} km`}
        </Text>
      )}
      {!!gym.address && (
        <Text style={[styles.rowAddr, { color: colors.iconInactive }]} numberOfLines={1}>
          {gym.address}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowItem: { paddingVertical: 14, paddingHorizontal: 22, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.04)" },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  rowTitle: { fontSize: 15, fontWeight: "700", flexShrink: 1 },
  rowMeta: { fontSize: 13, marginBottom: 2 },
  rowAddr: { fontSize: 12 },
});
