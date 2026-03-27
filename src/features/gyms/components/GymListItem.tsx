import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import type { GymPlace } from "../../../../lib/poi/types";

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
      <Text style={[styles.rowTitle, { color: colors.iconLabel }]} numberOfLines={1}>
        {gym.name}
      </Text>
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
  rowTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  rowMeta: { fontSize: 13, marginBottom: 2 },
  rowAddr: { fontSize: 12 },
});
