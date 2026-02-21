// src/features/community/challenges/JoinedChallengeChip.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function JoinedChallengeChip({
  title,
  color = "#111",
  onPress,
}: {
  title: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: color }]} />
      <Text style={styles.text} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 120,
    paddingVertical: 10,
    paddingHorizontal: 10,
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
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 8,
  },
  text: { fontSize: 13, fontWeight: "800", color: "#111" },
});
