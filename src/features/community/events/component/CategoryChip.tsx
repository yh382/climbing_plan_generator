// src/features/community/events/component/CategoryChip.tsx
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";

export default function CategoryChip({ text, size = "md" }: { text: string; size?: "md" | "sm" }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sm = size === "sm";

  return (
    <View style={[styles.chip, sm && styles.chipSm]}>
      <Text style={[styles.text, sm && styles.textSm]}>{text}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSm: { paddingHorizontal: 10, height: 26 },
  text: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
  textSm: { fontSize: 11 },
});
