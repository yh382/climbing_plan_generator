// src/components/shared/ClimbItemCard.tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getColorForGrade } from "../../../lib/gradeColors";
import type { LocalDayLogItem } from "../../features/journal/loglist/types";

interface ClimbItemCardProps {
  item: LocalDayLogItem;
  onPress: () => void;
}

function styleLabel(style?: string): string {
  switch (style) {
    case "flash":
      return "Flash";
    case "onsight":
      return "Onsight";
    case "redpoint":
      return "Redpoint";
    default:
      return "";
  }
}

export default function ClimbItemCard({ item, onPress }: ClimbItemCardProps) {
  const routeName = (item.name || "").trim();
  const gc = getColorForGrade(item.grade);
  const style = styleLabel(item.style);
  const attempts = item.attemptsTotal || item.attempts || 1;
  const note = (item.note || "").trim();

  // Media thumbnail
  const thumbUri =
    item.media?.[0]?.type === "video"
      ? item.media[0].coverUri || item.media[0].uri
      : item.media?.[0]?.uri || item.imageUri || "";

  const hasThumb = !!thumbUri;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Left thumbnail - always visible */}
      <View style={styles.thumbContainer}>
        {hasThumb ? (
          <Image
            source={{ uri: thumbUri }}
            style={styles.thumb}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="camera-outline" size={20} color="#D1D5DB" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Title row - route name in large text */}
        <Text style={styles.title} numberOfLines={1}>
          {routeName || item.grade}
        </Text>

        {/* Subtitle row - grade dot + grade + style + attempts */}
        <View style={styles.subtitleRow}>
          <View style={[styles.gradeDot, { backgroundColor: gc }]} />
          <Text style={styles.gradeText}>{item.grade}</Text>
          {style ? (
            <>
              <Text style={styles.separator}>·</Text>
              <Text style={styles.metaText}>{style}</Text>
            </>
          ) : null}
          <Text style={styles.separator}>·</Text>
          <Text style={styles.metaText}>{attempts}x</Text>
        </View>

        {/* Optional note */}
        {note ? (
          <Text style={styles.noteText} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <View style={styles.chevron}>
        <Text style={{ color: "#D1D5DB", fontSize: 14 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 0.6,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbContainer: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: 64,
    height: 64,
  },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  gradeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  separator: {
    fontSize: 12,
    color: "#9CA3AF",
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  noteText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  chevron: {
    paddingRight: 12,
    justifyContent: "center",
  },
});
