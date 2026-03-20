// src/components/shared/ExerciseLibraryCard.tsx

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type LocaleKey = "zh" | "en";

interface Props {
  title: string;
  description?: string;
  goal?: string;
  level?: string;
  minutes?: number | null;
  imageUrl?: string | null;
  onPress?: () => void;
  locale: LocaleKey;
}

export default function ExerciseLibraryCard({
  title,
  description,
  goal,
  level,
  minutes,
  imageUrl,
  onPress,
  locale,
}: Props) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardImgWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImg} />
        ) : (
          <View style={styles.cardImgPlaceholder}>
            <Ionicons name="image-outline" size={22} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.heartBtn}>
          <Ionicons name="heart-outline" size={18} color="#111" />
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={styles.cardTitleRow}>
          <View style={styles.blueBar} />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {description}
          </Text>
        ) : (
          <Text style={[styles.cardDesc, { color: "#9CA3AF" }]} numberOfLines={2}>
            {locale === "zh" ? "暂无简介" : "No description yet"}
          </Text>
        )}

        <Text style={styles.cardMeta} numberOfLines={1}>
          {goal} · {level}
        </Text>

        <View style={styles.cardBottomRow}>
          <View style={styles.iconRow}>
            <View style={styles.miniIconPill}>
              <Ionicons name="pricetag-outline" size={14} color="#111" />
            </View>
            <View style={styles.miniIconPill}>
              <Ionicons name="construct-outline" size={14} color="#111" />
            </View>
            <View style={styles.miniIconPill}>
              <Ionicons name="fitness-outline" size={14} color="#111" />
            </View>
          </View>

          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={14} color="#111" />
            <Text style={styles.timeText}>{minutes ? `${minutes}` : "--"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  cardImgWrap: {
    width: 120,
    height: 110,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  cardImg: { width: "100%", height: "100%" },
  cardImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  heartBtn: {
    position: "absolute",
    left: 10,
    bottom: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardRight: { flex: 1, minHeight: 110, paddingRight: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  blueBar: { width: 6, height: 22, borderRadius: 3, backgroundColor: "#2563EB" },

  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111", flexShrink: 1 },
  cardDesc: { marginTop: 6, fontSize: 12.5, color: "#374151", lineHeight: 16 },
  cardMeta: { marginTop: 6, fontSize: 11.5, color: "#6B7280" },

  cardBottomRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  miniIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },
  timeText: { fontSize: 13, fontWeight: "800", color: "#111" },
});
