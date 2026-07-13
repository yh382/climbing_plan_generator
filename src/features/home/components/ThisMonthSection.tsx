import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import PressableScale from "@/components/ui/PressableScale";
import useLogsStore from "@/store/useLogsStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { getGradeScore } from "@/services/stats/gradeAnalyzer";
import { gradeToScore, scoreToGrade } from "@/lib/gradeSystem";

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
function getMonthEnd(monthStart: string): string {
  const [y, m] = monthStart.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

type SessionLike = { date: string; discipline: string; sends: number; best?: string | null };

// Pick the highest grade for a given discipline group from this-month sessions,
// then convert into the user's preferred display scale (Font for boulder /
// French for rope when set). Returns "" when no qualifying grade exists.
function pickBestForGroup(
  sessions: SessionLike[],
  group: "boulder" | "rope",
  boulderScale: "V" | "Font",
  ropeScale: "YDS" | "French",
): string {
  let bestRaw = "";
  let bestRawDiscipline = "";
  let bestScore = -1;
  for (const se of sessions) {
    const isBoulder = se.discipline === "boulder";
    const isRope = se.discipline === "toprope" || se.discipline === "lead";
    if (group === "boulder" && !isBoulder) continue;
    if (group === "rope" && !isRope) continue;
    const raw = se.best;
    if (!raw || raw === "—" || raw === "V?") continue;
    const score = getGradeScore(raw, se.discipline as "boulder" | "toprope" | "lead");
    if (score > bestScore) {
      bestScore = score;
      bestRaw = raw;
      bestRawDiscipline = se.discipline;
    }
  }
  if (!bestRaw) return "";
  try {
    if (group === "boulder" && boulderScale === "Font") {
      return scoreToGrade(gradeToScore(bestRaw, "vscale"), "font");
    }
    if (group === "rope" && ropeScale === "French") {
      const sourceSystem = bestRawDiscipline === "boulder" ? "vscale" : "yds";
      return scoreToGrade(gradeToScore(bestRaw, sourceSystem), "french");
    }
  } catch {
    // Fall through to raw on conversion failure.
  }
  return bestRaw;
}

// "This Month" section — single unified read of sessions/sends, plus a Best
// cell that combines max boulder + max rope grades into one string ("V7 /
// 5.11b"). Discipline-toggle UI was removed in Window TAB_AND_HOME polish:
// users with mixed boulder + rope logs see both at once; pure boulder / pure
// rope users see a single grade. No redundant computation across pages.
export function ThisMonthSection() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr, boulderScale, ropeScale } = useSettings();
  const monthStart = useMemo(getMonthStart, []);
  const monthEnd = useMemo(() => getMonthEnd(monthStart), [monthStart]);
  const { sessions } = useLogsStore();

  const stats = useMemo(() => {
    const monthSessions = sessions.filter((se) => se.date >= monthStart && se.date < monthEnd);
    const totalSends = monthSessions.reduce((sum, se) => sum + se.sends, 0);
    const bestBoulder = pickBestForGroup(monthSessions, "boulder", boulderScale, ropeScale);
    const bestRope = pickBestForGroup(monthSessions, "rope", boulderScale, ropeScale);
    const bestParts = [bestBoulder, bestRope].filter(Boolean);
    return {
      sessions: monthSessions.length,
      sends: totalSends,
      best: bestParts.length > 0 ? bestParts.join(" / ") : "—",
    };
  }, [sessions, monthStart, monthEnd, boulderScale, ropeScale]);

  const goToActivity = () => router.push("/(drawer)/(tabs)/activity" as any);

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{tr("本月", "This Month")}</Text>

      <PressableScale style={styles.statsRow} onPress={goToActivity}>
        <View style={styles.statCol}>
          <Text style={styles.statValue} numberOfLines={1}>
            {stats.sessions}
          </Text>
          <Text style={styles.statLabel}>{tr("场次", "Sessions")}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue} numberOfLines={1}>
            {stats.sends}
          </Text>
          <Text style={styles.statLabel}>{tr("send 数", "Sends")}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {stats.best}
          </Text>
          <Text style={styles.statLabel}>{tr("最高级别", "Best")}</Text>
        </View>
      </PressableScale>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      paddingHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
    },
    // DL v1 — micro label ("topo annotation" voice).
    label: {
      ...theme.textStyles.microLabel,
      color: c.textSecondary,
      marginBottom: 14,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    statCol: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      ...theme.textStyles.monoValueLarge,
      color: c.textPrimary,
      marginBottom: 4,
      textAlign: "center",
    },
    statLabel: {
      ...theme.textStyles.microLabel,
      color: c.textTertiary,
      textAlign: "center",
    },
  });
