import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

interface Props {
  label: string;
}

export default function DateGroupHeader({ label }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      paddingTop: 24,
      paddingBottom: 12,
      paddingHorizontal: theme.spacing.screenPadding,
    },
    label: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });
