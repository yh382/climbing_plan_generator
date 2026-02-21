// src/features/community/challenges/ChallengeCardRow.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import ChallengeCategoryIcons from "./ChallengeCategoryIcons";
import type { ChallengeItem } from "./mockChallenges";

export default function ChallengeCardRow({
  item,
  onPress,
}: {
  item: ChallengeItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: item.color ?? "#111" }]} />

      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {item.description}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{item.dateRange}</Text>
          {typeof item.participants === "number" ? (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{item.participants} joined</Text>
            </>
          ) : null}
        </View>

        <ChallengeCategoryIcons categories={item.categories} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
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
  icon: { width: 44, height: 44, borderRadius: 14 },
  title: { fontSize: 15, fontWeight: "900", color: "#111" },
  desc: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaText: { fontSize: 12, color: "#9CA3AF", fontWeight: "700" },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB", marginHorizontal: 8 },
});
