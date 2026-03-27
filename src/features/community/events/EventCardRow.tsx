// src/features/community/events/EventCardRow.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const publisherLine = item.publisher.name + (item.location_text ? ` · ${item.location_text}` : "");

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Left: publisher logo placeholder */}
      <View style={styles.logo} />

      {/* Right content */}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatDateShort(item.start_at)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {publisherLine}
          </Text>

          {item.publisher.verified ? (
            <View style={styles.verified}>
              <Ionicons name="checkmark-circle" size={14} color="#306E6F" />
            </View>
          ) : null}
        </View>

        <EventTypeIcons type={item.category} venue={item.venue_type} discipline={item.discipline} />
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },

  logo: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    marginTop: 2,
  },

  title: { fontSize: 15, fontFamily: theme.fonts.black, color: colors.textPrimary },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  metaText: { fontSize: 12, color: colors.textTertiary, fontFamily: theme.fonts.bold, flexShrink: 1 },
  verified: { marginLeft: 6 },
});
