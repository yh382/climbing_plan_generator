import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import DailyLogCard from "../../session/components/DailyLogCard";
import type { PublicProfile, PublicSessionSummary } from "../../community/hooks";

type Props = {
  profile: PublicProfile;
  sessionSummary: PublicSessionSummary[];
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

export default function PublicStatsSection({ profile, sessionSummary }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
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
            <Text style={styles.kpiVal}>{sessionSummary.length}</Text>
            <Text style={styles.kpiLabel}>sessions</Text>
          </View>
        </View>
      </View>

      {/* Recent Sessions */}
      <Text style={styles.recentTitle}>Recent Sessions</Text>
      {sessionSummary.length > 0 ? (
        <View style={{ marginHorizontal: -16, gap: 0 }}>
          {sessionSummary.map((s) => (
            <DailyLogCard
              key={s.id}
              dateLabel={format(parseISO(s.date), "EEE · M.dd")}
              duration={formatDuration(s.durationMinutes)}
              attempts={s.attempts}
              sends={s.sends}
              maxGrade={s.bestGrade || "—"}
              onPress={() => router.push({ pathname: "/community/public-route-log", params: { sessionId: s.id } })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No recent sessions.</Text>
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
