// src/features/community/events/component/CategoryChip.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function CategoryChip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  text: { fontSize: 13, fontWeight: "900", color: "#111827" },
});
