import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import DailyLogCard from "../../session/components/DailyLogCard";
import type { PublicProfile, PublicDailySummary } from "../../community/hooks";

type Props = {
  profile: PublicProfile;
  dailySummary: PublicDailySummary[];
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

export default function PublicStatsSection({ profile, dailySummary }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Overall Stats Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overview</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{profile.totalSends}</Text>
            <Text style={styles.kpiLabel}>sends</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{profile.boulderMax || "—"}</Text>
            <Text style={styles.kpiLabel}>max B</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{profile.routeMax || "—"}</Text>
            <Text style={styles.kpiLabel}>max R</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{dailySummary.length}</Text>
            <Text style={styles.kpiLabel}>days</Text>
          </View>
        </View>
      </View>

      {/* Recent Climbs */}
      <Text style={styles.recentTitle}>Recent Climbs</Text>
      {dailySummary.length > 0 ? (
        <View style={{ marginHorizontal: -16, gap: 0 }}>
          {dailySummary.map((d) => (
            <DailyLogCard
              key={d.date}
              dateLabel={format(parseISO(d.date), "EEE · M.dd")}
              duration={formatDuration(d.durationMinutes)}
              climbs={d.climbs}
              sends={d.sends}
              maxGrade={d.bestGrade || "—"}
              onPress={() => {}}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No recent climbs.</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  kpiItem: {
    alignItems: "center",
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: theme.fonts.monoMedium,
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: theme.typography.caption.fontSize,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 8,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
    opacity: 0.5,
  },
  emptyText: {
    color: colors.textTertiary,
    fontFamily: theme.fonts.regular,
    marginTop: 8,
  },
});
