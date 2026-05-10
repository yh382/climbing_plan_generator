import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import useLogsStore from "@/store/useLogsStore";
import { NativeSegmentedControl } from "@/components/ui";
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

type Discipline = "boulder" | "rope";

// LogType values: "boulder" | "toprope" | "lead". "rope" UI cell aggregates
// both rope variants. Mapping kept local — this is the only consumer.
function matchesDiscipline(logType: string, discipline: Discipline): boolean {
  if (discipline === "boulder") return logType === "boulder";
  return logType === "toprope" || logType === "lead";
}

// "This Month" no-card section: large primary number + B/R toggle.
// Phase 4 ships segment-only (R10 fallback); pager swipe deferred.
export function ThisMonthSection() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr, boulderScale, ropeScale } = useSettings();
  const monthStart = useMemo(getMonthStart, []);
  const monthEnd = useMemo(() => getMonthEnd(monthStart), [monthStart]);
  const [discipline, setDiscipline] = useState<Discipline>("boulder");
  const { sessions } = useLogsStore();

  const stats = useMemo(() => {
    const monthSessions = sessions.filter(
      (se) => se.date >= monthStart && se.date < monthEnd && matchesDiscipline(se.discipline, discipline),
    );
    const totalSends = monthSessions.reduce((sum, se) => sum + se.sends, 0);

    let bestRaw = "";
    let bestRawDiscipline = "";
    let bestScore = -1;
    for (const se of monthSessions) {
      if (!se.best || se.best === "—" || se.best === "V?") continue;
      const score = getGradeScore(se.best, se.discipline);
      if (score > bestScore) {
        bestScore = score;
        bestRaw = se.best;
        bestRawDiscipline = se.discipline;
      }
    }

    let bestDisplay = bestRaw;
    if (bestRaw) {
      try {
        if (discipline === "boulder" && boulderScale === "Font") {
          const score = gradeToScore(bestRaw, "vscale");
          bestDisplay = scoreToGrade(score, "font");
        } else if (discipline === "rope" && ropeScale === "French") {
          // Source could be YDS ("5.11b"); convert to French.
          const score = gradeToScore(bestRaw, bestRawDiscipline === "boulder" ? "vscale" : "yds");
          bestDisplay = scoreToGrade(score, "french");
        }
      } catch {
        bestDisplay = bestRaw;
      }
    }

    return {
      sessions: monthSessions.length,
      sends: totalSends,
      best: bestDisplay || "—",
    };
  }, [sessions, monthStart, monthEnd, discipline, boulderScale, ropeScale]);

  const goToActivity = () => router.push("/(drawer)/(tabs)/activity" as any);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{tr("本月", "This Month")}</Text>
        <View style={styles.segmentWrap}>
          <NativeSegmentedControl
            options={[tr("抱石", "Boulder"), tr("线路", "Rope")]}
            selectedIndex={discipline === "boulder" ? 0 : 1}
            onSelect={(i) => setDiscipline(i === 0 ? "boulder" : "rope")}
            style={{ height: 28 }}
          />
        </View>
      </View>

      <Pressable style={styles.statsRow} onPress={goToActivity}>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.sends}</Text>
          <Text style={styles.statLabel}>{tr("send 数", "Sends")}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.sessions}</Text>
          <Text style={styles.statLabel}>{tr("场次", "Sessions")}</Text>
        </View>
        <View style={styles.statCol}>
          <Text style={styles.statValue}>{stats.best}</Text>
          <Text style={styles.statLabel}>{tr("最高级别", "Best")}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      paddingHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    label: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    segmentWrap: {
      width: 160,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    statCol: {
      flex: 1,
    },
    statValue: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 30,
      color: c.textPrimary,
      letterSpacing: -1,
      marginBottom: 4,
    },
    statLabel: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
    },
  });
