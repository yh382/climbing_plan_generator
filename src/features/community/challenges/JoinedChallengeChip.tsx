// src/features/community/challenges/JoinedChallengeChip.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";

export default function JoinedChallengeChip({
  title,
  color = "#111",
  onPress,
}: {
  title: string;
  color?: string;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: color }]} />
      <Text style={styles.text} numberOfLines={1}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  text: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
});
