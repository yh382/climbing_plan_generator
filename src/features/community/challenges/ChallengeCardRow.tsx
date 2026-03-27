// src/features/community/challenges/ChallengeCardRow.tsx
import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";
import { getChallengeStatus } from "./types";
import type { ChallengeOut } from "./types";

function formatDateRange(startAt: string, endAt?: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
  };
  const s = fmt(startAt);
  const e = endAt ? fmt(endAt) : "";
  return e ? `${s} – ${e}` : s;
}

const TIER_LABELS: Record<string, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
  tier4: "Tier 4",
  unlocked: "Unlocked",
};

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  tier1: "#60A5FA",
  tier2: "#A78BFA",
  tier3: "#F59E0B",
  tier4: "#EF4444",
  unlocked: "#10B981",
};

function TierProgress({ tiers, colors }: { tiers: Record<string, number>; colors: ReturnType<typeof useThemeColors> }) {
  const sorted = Object.entries(tiers).sort((a, b) => a[1] - b[1]);
  return (
    <View style={tierStyles.row}>
      {sorted.map(([name, threshold]) => (
        <View key={name} style={tierStyles.chip}>
          <View style={[tierStyles.dot, { backgroundColor: TIER_COLORS[name] || colors.textSecondary }]} />
          <Text style={[tierStyles.label, { color: colors.textSecondary }]}>
            {TIER_LABELS[name] || name}: {threshold}
          </Text>
        </View>
      ))}
    </View>
  );
}

const tierStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: "700" },
});

export default function ChallengeCardRow({
  item,
  onPress,
}: {
  item: ChallengeOut;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uiStatus = getChallengeStatus(item);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.icon} />

      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.desc} numberOfLines={1}>
          {item.description || ""}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDateRange(item.startAt, item.endAt)}</Text>
          {typeof item.participantCount === "number" && (
            <>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{item.participantCount} joined</Text>
            </>
          )}
        </View>

        {/* Tier progress (for rule-engine challenges) */}
        {item.rulePayload?.tiers && (
          <TierProgress tiers={item.rulePayload.tiers} colors={colors} />
        )}

        {/* Status + category chips */}
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, uiStatus === "active" && styles.statusActive, uiStatus === "upcoming" && styles.statusUpcoming, uiStatus === "past" && styles.statusPast]}>
            <Text style={styles.statusText}>{uiStatus}</Text>
          </View>
          {item.category && item.category !== "custom" ? (
            <View style={styles.kindChip}>
              <Text style={styles.statusText}>{item.category}</Text>
            </View>
          ) : null}
          {item.challengeKind ? (
            <View style={styles.kindChip}>
              <Text style={styles.statusText}>{item.challengeKind}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.cardDark },
  title: { fontSize: 15, fontWeight: "900", color: colors.textPrimary },
  desc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaText: { fontSize: 12, color: colors.textTertiary, fontWeight: "700" },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.border, marginHorizontal: 8 },
  statusRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.backgroundSecondary },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusUpcoming: { backgroundColor: "#FEF3C7" },
  statusPast: { backgroundColor: colors.backgroundSecondary },
  kindChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: colors.backgroundSecondary },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
});
