// src/features/dailysummary/DailyDateNavBar.tsx
// Sticky header row for the daily-summary page: flanks the displayed date
// with prev/next chevrons so they scroll/pin as a coherent unit. The static
// large title "Daily Summary" (in the nav bar) provides the collapse chrome;
// this row is the date-navigation affordance.

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { format, parseISO } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import { HeaderButton } from "../../components/ui/HeaderButton";

type Props = {
  /** ISO date YYYY-MM-DD */
  date: string;
  onPrev: () => void;
  onNext: () => void;
  /** Optional — tap the date label. Reserved for a future calendar picker. */
  onPickDate?: () => void;
};

export default function DailyDateNavBar({ date, onPrev, onNext, onPickDate }: Props) {
  const colors = useThemeColors();
  const { lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const locale = lang === "en" ? enUS : zhCN;
  const label = format(parseISO(date), "EEEE, MMM d", { locale });

  return (
    <View style={styles.wrap}>
      <HeaderButton icon="chevron.left" onPress={onPrev} />
      <TouchableOpacity
        style={styles.dateButton}
        onPress={onPickDate}
        disabled={!onPickDate}
        activeOpacity={onPickDate ? 0.6 : 1}
      >
        <Text style={styles.dateText}>{label}</Text>
      </TouchableOpacity>
      <HeaderButton icon="chevron.right" onPress={onNext} />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.background,
    },
    dateButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dateText: {
      fontSize: 18,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
  });
