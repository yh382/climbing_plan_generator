// P2-E — renders a challenge's goal tiers from rule_payload.tiers (W3
// structured rule builder: { rule_type, tiers: { name: threshold } }).
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";

// rule_type → unit label (zh, en). Unknown types render the bare threshold.
const UNIT: Record<string, [string, string]> = {
  send_count: ["完攀", "sends"],
  flash_count: ["flash", "flashes"],
  session_count: ["次", "sessions"],
  points: ["分", "pts"],
  unique_routes: ["条线", "routes"],
  vertical_meters: ["米", "m"],
};

export default function ChallengeTiers({
  ruleType,
  tiers,
}: {
  ruleType?: string;
  tiers?: Record<string, number | string> | null;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();

  const sorted = useMemo(
    () =>
      tiers
        ? Object.entries(tiers).sort((a, b) => Number(a[1]) - Number(b[1]))
        : [],
    [tiers],
  );
  if (sorted.length === 0) return null;

  const unit = ruleType ? UNIT[ruleType] : undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{tr("目标", "Goals")}</Text>
      <View style={styles.card}>
        {sorted.map(([name, threshold], i) => (
          <View
            key={name}
            style={[styles.row, i === sorted.length - 1 && styles.rowLast]}
          >
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.val}>
              {String(threshold)}
              {unit ? ` ${tr(unit[0], unit[1])}` : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: { paddingHorizontal: 20, marginTop: 8, marginBottom: 8 },
    title: {
      fontFamily: theme.fonts.black,
      fontSize: 18,
      color: colors.textPrimary,
      marginBottom: 10,
      letterSpacing: -0.4,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    name: { fontFamily: theme.fonts.bold, fontSize: 14, color: colors.textPrimary },
    val: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 15,
      color: colors.accent,
    },
  });
