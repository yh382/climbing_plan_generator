// src/components/ui/FilterChip.tsx
// Interactive pill for filter rows. Toggles accent when active.

import { useMemo } from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../lib/useThemeColors";
import { theme } from "../../lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  active?: boolean;
  /** Optional Ionicons name shown on the left. */
  leadingIcon?: keyof typeof Ionicons.glyphMap;
  /** Show a small ▾ caret on the right (for picker-style chips). */
  dropdown?: boolean;
};

export default function FilterChip({ label, onPress, active, leadingIcon, dropdown }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const textColor = active ? "#FFFFFF" : colors.textPrimary;
  const bg = active ? colors.accent : colors.backgroundSecondary;

  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {leadingIcon ? <Ionicons name={leadingIcon} size={13} color={textColor} /> : null}
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
        {dropdown ? <Ionicons name="chevron-down" size={12} color={textColor} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (_c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 5 },
    text: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
    },
  });
