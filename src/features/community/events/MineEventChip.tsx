// src/features/community/events/MineEventChip.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { EventOut } from "./types";

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function MineEventChip({
  item,
  onPress,
}: {
  item: EventOut;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.logo, { backgroundColor: "#111" }]} />
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {formatDateShort(item.start_at)}
      </Text>
      <Text style={styles.gym} numberOfLines={1}>
        {item.publisher.name}
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
