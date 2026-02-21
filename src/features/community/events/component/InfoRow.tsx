// src/features/community/events/component/InfoRow.tsx
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InfoRow({
  icon,
  children,
  right,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  right?: React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.row, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color="#374151" />
      </View>

      <View style={styles.content}>
        <View style={{ flex: 1, paddingRight: 8 }}>{children}</View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, flexDirection: "row", alignItems: "center" },
  right: { alignItems: "flex-end", justifyContent: "center" },
});
