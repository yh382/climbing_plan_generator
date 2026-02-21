// src/features/community/events/EventCardRow.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventItem } from "./mockEvents";
import EventTypeIcons from "./EventTypeIcons";

export default function EventCardRow({
  item,
  onPress,
}: {
  item: EventItem;
  onPress?: () => void;
}) {
  const gymLine = `${item.gym.name} • ${item.gym.city}${
    typeof item.gym.distanceMiles === "number" ? ` • ${item.gym.distanceMiles.toFixed(1)} mi` : ""
  }`;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Left: gym logo */}
      <View style={[styles.logo, { backgroundColor: item.gym.accent ?? "#111" }]} />

      {/* Right content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={styles.metaText}>{item.dateText}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={14} color="#9CA3AF" />
          <Text style={styles.metaText} numberOfLines={1}>
            {gymLine}
          </Text>

          {item.gym.verified ? (
            <View style={styles.verified}>
              <Ionicons name="checkmark-circle" size={14} color="#111" />
            </View>
          ) : null}
        </View>

        {/* ✅ Icons go under field info */}
        <EventTypeIcons type={item.type} venue={item.venue} discipline={item.discipline} />
      </View>

      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    marginBottom: 12,
  },

  logo: { width: 44, height: 44, borderRadius: 14, marginTop: 2 },

  title: { fontSize: 15, fontWeight: "900", color: "#111" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  metaText: { fontSize: 12, color: "#9CA3AF", fontWeight: "800", flexShrink: 1 },
  verified: { marginLeft: 6 },
});
