// src/features/community/events/EventCardRow.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventOut } from "./types";
import EventTypeIcons from "./EventTypeIcons";

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${months[d.getMonth()]} ${d.getDate()} · ${hh}:${mm}`;
}

export default function EventCardRow({
  item,
  onPress,
}: {
  item: EventOut;
  onPress?: () => void;
}) {
  const publisherLine = item.publisher.name + (item.location_text ? ` · ${item.location_text}` : "");

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Left: publisher logo placeholder */}
      <View style={[styles.logo, { backgroundColor: "#111" }]} />

      {/* Right content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
          <Text style={styles.metaText}>{formatDateShort(item.start_at)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={14} color="#9CA3AF" />
          <Text style={styles.metaText} numberOfLines={1}>
            {publisherLine}
          </Text>

          {item.publisher.verified ? (
            <View style={styles.verified}>
              <Ionicons name="checkmark-circle" size={14} color="#111" />
            </View>
          ) : null}
        </View>

        <EventTypeIcons type={item.category} venue={item.venue_type} discipline={item.discipline} />
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
