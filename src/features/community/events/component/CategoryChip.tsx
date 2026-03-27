// src/features/community/events/component/CategoryChip.tsx
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";

export default function CategoryChip({ text }: { text: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{text}</Text>
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
  text: { fontSize: 13, fontWeight: "900", color: colors.textPrimary },
});
