// P2-E — renders a challenge's goal tiers from rule_payload.tiers (W3
// structured rule builder: { rule_type, tiers: { name: threshold } }).
// CE ★3: internal tier keys ("tier1"/"tier2") map to human labels, and a
// joined user sees a quiet progress bar + mono "score/threshold" per tier.
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

// Admin-side rule builder stores unnamed tiers under internal keys
// ("tier1", "tier2", …) — never surface those to climbers.
function tierLabel(name: string, tr: (zh: string, en: string) => string): string {
  const m = /^tier\s*(\d+)$/i.exec(name.trim());
  if (m) return tr(`目标 ${m[1]}`, `Goal ${m[1]}`);
  return name;
}

export default function ChallengeTiers({
  ruleType,
  tiers,
  myScore,
}: {
  ruleType?: string;
  tiers?: Record<string, number | string> | null;
  /** Joined user's current score; null/undefined hides progress. */
  myScore?: number | null;
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
  const showProgress = myScore !== null && myScore !== undefined;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{tr("目标", "Goals")}</Text>
      <View style={styles.card}>
        {sorted.map(([name, threshold], i) => {
          const target = Number(threshold);
          const done = showProgress && Number.isFinite(target) && target > 0 && (myScore as number) >= target;
          const ratio =
            showProgress && Number.isFinite(target) && target > 0
              ? Math.min((myScore as number) / target, 1)
              : 0;
          return (
            <View
              key={name}
              style={[styles.row, i === sorted.length - 1 && styles.rowLast]}
            >
              <View style={styles.rowTop}>
                <Text style={styles.name}>{tierLabel(name, tr)}</Text>
                <Text style={[styles.val, done && styles.valDone]}>
                  {showProgress ? `${myScore}/${String(threshold)}` : String(threshold)}
                  {unit ? ` ${tr(unit[0], unit[1])}` : ""}
                </Text>
              </View>
              {showProgress ? (
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
                </View>
              ) : null}
            </View>
          );
        })}
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
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: { borderBottomWidth: 0 },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    name: { fontFamily: theme.fonts.bold, fontSize: 14, color: colors.textPrimary },
    val: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 15,
      color: colors.textSecondary,
    },
    valDone: { color: colors.accent },
    // Progress track — backgroundSecondary is sanctioned for tracks (§1).
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.backgroundSecondary,
      marginTop: 8,
      overflow: "hidden",
    },
    fill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
  });
