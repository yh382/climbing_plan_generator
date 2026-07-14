// src/features/community/events/EventCardRow.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { formatProgramDate, type ProgramDateLang } from "@/lib/formatProgramDate";
import type { EventOut } from "./types";
import EventTypeIcons from "./EventTypeIcons";

function formatDateShort(iso: string, lang: ProgramDateLang): string {
  const date = formatProgramDate(iso, lang);
  if (!date) return iso;
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} · ${hh}:${mm}`;
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
  const { tr, lang } = useSettings();
  const publisherLine = item.publisher.name + (item.location_text ? ` · ${item.location_text}` : "");
  const hasCapacity = item.details?.capacity != null;
  const full = hasCapacity && (item.spots_left ?? 0) <= 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {/* Left: publisher logo placeholder */}
      <View style={styles.logo} />

      {/* Right content */}
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          {item.is_featured ? (
            <Ionicons name="star" size={13} color="#E8A93C" />
          ) : null}
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatDateShort(item.start_at, lang)}</Text>
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

        {hasCapacity ? (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={full ? "#C0392B" : colors.textSecondary} />
            <Text style={[styles.metaText, full && { color: "#C0392B" }]}>
              {full
                ? tr("已满", "Full")
                : `${item.spots_left ?? 0} ${tr("剩余名额", "spots left")}`}
            </Text>
          </View>
        ) : null}

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

  titleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  title: { fontSize: 15, fontFamily: theme.fonts.black, color: colors.textPrimary, flexShrink: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  metaText: { fontSize: 12, color: colors.textTertiary, fontFamily: theme.fonts.bold, flexShrink: 1 },
  verified: { marginLeft: 6 },
});
