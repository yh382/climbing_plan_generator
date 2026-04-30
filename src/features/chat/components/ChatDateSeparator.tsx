import React, { useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";

interface Props {
  iso: string;
}

function formatChatDate(iso: string, lang: "zh" | "en", tr: (zh: string, en: string) => string): string {
  const d = new Date(iso);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((todayStart.getTime() - dayStart.getTime()) / 86400000);

  if (diffDays === 0) return tr("今天", "Today");
  if (diffDays === 1) return tr("昨天", "Yesterday");
  if (diffDays < 7) {
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { weekday: "long" });
  }
  return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ChatDateSeparator({ iso }: Props) {
  const colors = useThemeColors();
  const { lang, tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const label = useMemo(() => formatChatDate(iso, lang as "zh" | "en", tr), [iso, lang, tr]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      paddingVertical: 12,
    },
    label: {
      fontSize: 11,
      fontFamily: theme.fonts.monoMedium,
      color: colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
  });
