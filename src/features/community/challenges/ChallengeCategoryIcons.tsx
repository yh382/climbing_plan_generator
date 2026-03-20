// src/features/community/challenges/ChallengeCategoryIcons.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
type ChallengeCategory = "boulder" | "toprope" | "indoor" | "outdoor";

const iconMap: Record<ChallengeCategory, { name: any; label: string }> = {
  boulder: { name: "cube-outline", label: "Boulder" },
  toprope: { name: "git-branch-outline", label: "Top Rope" },
  indoor: { name: "home-outline", label: "Indoor" },
  outdoor: { name: "leaf-outline", label: "Outdoor" },
};

export default function ChallengeCategoryIcons({
  categories,
}: {
  categories: ChallengeCategory[];
}) {
  return (
    <View style={styles.row}>
      {categories.map((c) => (
        <View key={c} style={styles.iconChip}>
          <Ionicons name={iconMap[c].name} size={14} color="#6B7280" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
