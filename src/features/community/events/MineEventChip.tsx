// src/features/community/events/UpcomingEventChip.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { EventItem } from "./mockEvents";

export default function MineEventChip({
  item,
  onPress,
}: {
  item: EventItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.logo, { backgroundColor: item.gym.accent ?? "#111" }]} />
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.dateText}
      </Text>
      <Text style={styles.gym} numberOfLines={1}>
        {item.gym.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 180,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  logo: { width: 34, height: 34, borderRadius: 12, marginBottom: 10 },
  title: { fontSize: 13, fontWeight: "900", color: "#111" },
  meta: { marginTop: 4, fontSize: 12, fontWeight: "800", color: "#9CA3AF" },
  gym: { marginTop: 2, fontSize: 12, fontWeight: "800", color: "#6B7280" },
});
