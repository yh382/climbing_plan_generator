// src/components/shared/GradeSuggestionCard.tsx
// Climber summary card. Shared between outdoor + gym route detail.
//
// Window D1_D2_E2 — restored histogram of `grade_text` + majority-feel
// pill after the backend `/ascents` endpoints started echoing `feel`
// alongside the existing `grade_text`. Displayed only when there is
// enough signal to be meaningful (≥1 distinct grade, ≥5 logs for the
// feel pill) — otherwise the card collapses back to the avg-stars +
// climber-count footer.

import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../lib/useThemeColors';
import { useSettings } from '../../contexts/SettingsContext';
import { theme } from '../../lib/theme';

export type SendLogFeel = 'soft' | 'solid' | 'hard';

export type SendLog = {
  user_id: string;
  username: string;
  stars?: number;
  /** Per-log graded text — populates the histogram bins. */
  grade_text?: string | null;
  /** Per-log subjective feel — populates the majority-feel pill. */
  feel?: SendLogFeel | null;
};

interface GradeSuggestionCardProps {
  logs: SendLog[];
  /** Server-side aggregate average stars. Preferred over deriving from logs. */
  avgStars?: number | null;
  /** Whole-card tap handler. If omitted, card is not pressable. */
  onPress?: () => void;
}

const MIN_LOGS_FOR_FEEL_PILL = 5;
const MAX_HISTOGRAM_BARS = 5;

type HistogramRow = { grade: string; count: number; pct: number };

function buildHistogram(logs: SendLog[]): HistogramRow[] {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const g = (l.grade_text ?? '').trim();
    if (!g) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const rows = Array.from(counts.entries()).map(([grade, count]) => ({
    grade,
    count,
    pct: count / total,
  }));
  // Top-N by frequency, ties broken alphabetically for stability.
  rows.sort((a, b) => (b.count - a.count) || a.grade.localeCompare(b.grade));
  return rows.slice(0, MAX_HISTOGRAM_BARS);
}

function pickMajorityFeel(logs: SendLog[]): SendLogFeel | null {
  const counts: Record<SendLogFeel, number> = { soft: 0, solid: 0, hard: 0 };
  let total = 0;
  for (const l of logs) {
    const f = l.feel;
    if (f === 'soft' || f === 'solid' || f === 'hard') {
      counts[f] += 1;
      total += 1;
    }
  }
  if (total < MIN_LOGS_FOR_FEEL_PILL) return null;
  let winner: SendLogFeel = 'solid';
  let max = -1;
  (['soft', 'solid', 'hard'] as SendLogFeel[]).forEach((k) => {
    if (counts[k] > max) {
      winner = k;
      max = counts[k];
    }
  });
  // Surface the pill only when the winning feel is actually skewed —
  // otherwise "solid" is the trivial default and adds noise.
  if (winner === 'solid' && max < total * 0.5) return null;
  return winner;
}

export default function GradeSuggestionCard({
  logs,
  avgStars: avgStarsProp,
  onPress,
}: GradeSuggestionCardProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const avgStars = useMemo(() => {
    if (avgStarsProp != null) return avgStarsProp;
    const rated = logs.filter((l) => l.stars != null);
    if (rated.length === 0) return null;
    return rated.reduce((s, l) => s + (l.stars ?? 0), 0) / rated.length;
  }, [logs, avgStarsProp]);

  const histogram = useMemo(() => buildHistogram(logs), [logs]);
  const majorityFeel = useMemo(() => pickMajorityFeel(logs), [logs]);

  const climberCount = logs.length;
  const firstClimber = logs[0]?.username;

  if (climberCount === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>
          {tr('暂无攀登记录，成为第一个!', 'No ascents yet — be the first!')}
        </Text>
      </View>
    );
  }

  const Container: any = onPress ? Pressable : View;
  const containerProps = onPress
    ? {
        onPress,
        style: ({ pressed }: { pressed: boolean }) => [
          styles.card,
          pressed && styles.pressed,
        ],
      }
    : { style: styles.card };

  const feelLabel: Record<SendLogFeel, string> = {
    soft: tr('偏软', 'Soft'),
    solid: tr('准确', 'Solid'),
    hard: tr('偏硬', 'Hard'),
  };

  return (
    <Container {...containerProps}>
      <View style={styles.headerRow}>
        {avgStars != null && (
          <View style={styles.starGroup}>
            <Text style={styles.avgStars}>{avgStars.toFixed(1)}</Text>
            <Ionicons name="star" size={16} color="#FFD60A" style={{ marginLeft: 4 }} />
          </View>
        )}
        {majorityFeel && (
          <View style={[styles.feelPill, { backgroundColor: colors.pillBackground }]}>
            <Text style={[styles.feelPillText, { color: colors.pillText }]}>
              {feelLabel[majorityFeel].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {histogram.length > 0 && (
        <View style={styles.histogram}>
          {histogram.map((row) => (
            <View key={row.grade} style={styles.histRow}>
              <Text style={styles.histGrade}>{row.grade}</Text>
              <View style={styles.histTrack}>
                <View
                  style={[
                    styles.histFill,
                    {
                      width: `${Math.max(8, row.pct * 100)}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.histCount}>{row.count}</Text>
            </View>
          ))}
        </View>
      )}

      {firstClimber && (
        <View style={styles.climbersRow}>
          <Text style={styles.climbersText}>
            {climberCount > 1
              ? tr(
                  `${firstClimber} + ${climberCount - 1} 人记录了这条路线`,
                  `${firstClimber} + ${climberCount - 1} climbers logged this`,
                )
              : tr(
                  `${firstClimber} 记录了这条路线`,
                  `${firstClimber} logged this`,
                )}
          </Text>
          {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />}
        </View>
      )}
    </Container>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.cardBackground,
      borderRadius: theme.borderRadius.card,
      padding: 16,
    },
    pressed: {
      opacity: 0.7,
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      paddingVertical: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    starGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avgStars: {
      fontFamily: theme.fonts.black,
      fontSize: 22,
      color: c.textPrimary,
    },
    feelPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
    },
    feelPillText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    histogram: {
      gap: 6,
      marginBottom: 12,
    },
    histRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    histGrade: {
      fontFamily: 'DMMono_500Medium',
      fontSize: 12,
      color: c.textSecondary,
      width: 36,
    },
    histTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.backgroundSecondary,
      overflow: 'hidden',
    },
    histFill: {
      height: '100%',
      borderRadius: 4,
    },
    histCount: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textTertiary,
      width: 20,
      textAlign: 'right',
    },
    climbersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    climbersText: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      flex: 1,
    },
  });
