// src/features/community/challenges/ChallengeCardRow.tsx
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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

function TierProgress({ tiers }: { tiers: Record<string, number> }) {
  const sorted = Object.entries(tiers).sort((a, b) => a[1] - b[1]);
  return (
    <View style={tierStyles.row}>
      {sorted.map(([name, threshold]) => (
        <View key={name} style={tierStyles.chip}>
          <View style={[tierStyles.dot, { backgroundColor: TIER_COLORS[name] || "#9CA3AF" }]} />
          <Text style={tierStyles.label}>
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
  label: { fontSize: 10, fontWeight: "700", color: "#6B7280" },
});

export default function ChallengeCardRow({
  item,
  onPress,
}: {
  item: ChallengeOut;
  onPress?: () => void;
}) {
  const uiStatus = getChallengeStatus(item);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.icon, { backgroundColor: "#111" }]} />

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
          <TierProgress tiers={item.rulePayload.tiers} />
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

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    marginBottom: 12,
  },
  icon: { width: 44, height: 44, borderRadius: 14 },
  title: { fontSize: 15, fontWeight: "900", color: "#111" },
  desc: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaText: { fontSize: 12, color: "#9CA3AF", fontWeight: "700" },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB", marginHorizontal: 8 },
  statusRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#F3F4F6" },
  statusActive: { backgroundColor: "#DCFCE7" },
  statusUpcoming: { backgroundColor: "#FEF3C7" },
  statusPast: { backgroundColor: "#E5E7EB" },
  kindChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: "#F3F4F6" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#374151" },
});
