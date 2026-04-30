// src/features/activity/ActivitySubtitle.tsx
// Small date label rendered just under the native large title. Placed as
// the first scrollable row in each Activity segment so it appears directly
// below "Activity" at rest and scrolls away on scroll (the sticky segmented
// control stays pinned). react-native-screens doesn't currently expose
// UINavigationItem.subtitle, so the subtitle lives in content space.

import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import { format } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";

export default function ActivitySubtitle() {
  const colors = useThemeColors();
  const { lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const locale = lang === "en" ? enUS : zhCN;
  const label = format(new Date(), "EEEE, MMM d", { locale });

  return <Text style={styles.text}>{label}</Text>;
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    text: {
      // 16pt matches iOS native large-title leading margin on iPhone portrait.
      paddingHorizontal: 16,
      // Pull the subtitle up toward the native large title's baseline; iOS
      // adds ~8pt bottom padding under the large title by default.
      marginTop: -6,
      paddingBottom: 6,
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
  });
