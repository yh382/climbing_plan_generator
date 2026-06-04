// src/features/outdoor/components/AreaListItem.tsx
// Compact area row for the gyms-map sheet list — visually peer of GymListItem.

import React from "react";
import { Text, Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
// BR Track A: this card renders the top-level Region (was Area). Type
// alias kept for caller minimum-diff — Track D will rename.
import type { Region as Area } from "../types";

interface AreaListItemProps {
  area: Area;
  distanceM?: number;
  onPress: () => void;
  colors: {
    iconLabel: string;
    iconInactive: string;
  };
}

export function AreaListItem({ area, distanceM, onPress, colors }: AreaListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={styles.rowItem}
    >
      <View style={styles.titleRow}>
        <Ionicons
          name="trail-sign-outline"
          size={14}
          color={colors.iconLabel}
          style={{ marginRight: 6 }}
        />
        <Text style={[styles.rowTitle, { color: colors.iconLabel }]} numberOfLines={1}>
          {area.name}
        </Text>
      </View>
      <Text style={[styles.rowMeta, { color: colors.iconInactive }]} numberOfLines={1}>
        {area.route_count ?? 0} routes
        {distanceM != null
          ? ` · ${distanceM < 1000 ? `${Math.round(distanceM)} m` : `${(distanceM / 1000).toFixed(1)} km`}`
          : ""}
      </Text>
      {!!area.region && (
        <Text style={[styles.rowAddr, { color: colors.iconInactive }]} numberOfLines={1}>
          {area.region}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowItem: { paddingVertical: 14, paddingHorizontal: 22, borderBottomWidth: 0.5, borderBottomColor: "rgba(0,0,0,0.04)" },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  rowTitle: { fontSize: 15, fontWeight: "700" },
  rowMeta: { fontSize: 13, marginBottom: 2 },
  rowAddr: { fontSize: 12 },
});
