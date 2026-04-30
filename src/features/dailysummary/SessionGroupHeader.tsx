// src/features/dailysummary/SessionGroupHeader.tsx
// Small subheading separating multiple sessions within a single day on the
// daily summary page.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";

type Props = {
  index: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  duration: string;  // "2h 30m"
};

export default function SessionGroupHeader({ index, startTime, endTime, duration }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const start = new Date(startTime);
  const end = new Date(endTime);

  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <Text style={styles.text}>
        {tr(`第 ${index} 次`, `Session ${index}`)} · {format(start, "HH:mm")}-{format(end, "HH:mm")} · {duration}
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    },
    rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    text: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
  });
