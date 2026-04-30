// src/components/shared/GradeSuggestionCard.tsx
// KAYA-style aggregate card: avg stars + majority feel + grade histogram + climbers CTA.
// Shared between outdoor and gym route detail (Window AS) — both pass an
// SendLog[] derived from their respective /ascents endpoints. Avg stars are
// taken from a server-computed aggregate when supplied (single source of truth);
// histogram/feel still derive from the passed-in logs.

import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../lib/useThemeColors';
import { useSettings } from '../../contexts/SettingsContext';
import { theme } from '../../lib/theme';

export type SendLog = {
  user_id: string;
  username: string;
  stars?: number;
  suggested_grade_text?: string;
  grade_score?: number;
  feel?: 'soft' | 'solid' | 'hard';
};

interface GradeSuggestionCardProps {
  originalGrade: string;
  logs: SendLog[];
  /** Server-side aggregate average stars. Preferred over deriving from logs. */
  avgStars?: number | null;
  /** Whole-card tap handler. If omitted, card is not pressable. */
  onPress?: () => void;
}

function modeGrade(logs: SendLog[], fallback: string): string {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const g = l.suggested_grade_text ?? fallback;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  let best = fallback;
  let bestCount = 0;
  for (const [g, c] of counts) {
    if (c > bestCount) { best = g; bestCount = c; }
  }
  return best;
}

function majorityFeel(logs: SendLog[]): 'soft' | 'solid' | 'hard' {
  const counts: Record<'soft' | 'solid' | 'hard', number> = { soft: 0, solid: 0, hard: 0 };
  for (const l of logs) {
    if (l.feel) counts[l.feel]++;
  }
  const entries = Object.entries(counts) as [keyof typeof counts, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function gradeHistogram(logs: SendLog[], fallback: string) {
  const counts = new Map<string, number>();
  for (const l of logs) {
    const g = l.suggested_grade_text ?? fallback;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return entries;
}

export default function GradeSuggestionCard({
  originalGrade,
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

  const mode = useMemo(() => modeGrade(logs, originalGrade), [logs, originalGrade]);
  const feel = useMemo(() => majorityFeel(logs), [logs]);
  const histogram = useMemo(() => gradeHistogram(logs, originalGrade), [logs, originalGrade]);

  const maxCount = histogram.reduce((m, [, c]) => Math.max(m, c), 0);
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

  return (
    <Container {...containerProps}>
      {/* Top row: avg stars + majority feel + mode grade */}
      <View style={styles.topRow}>
        {avgStars != null && (
          <>
            <Text style={styles.avgStars}>{avgStars.toFixed(1)}</Text>
            <Ionicons name="star" size={16} color="#FFD60A" style={{ marginLeft: 3, marginRight: 10 }} />
          </>
        )}
        <Text style={styles.feelText}>{feel.charAt(0).toUpperCase() + feel.slice(1)}</Text>
        <Text style={styles.separator}>·</Text>
        <Text style={styles.modeGrade}>{mode}</Text>
      </View>

      {/* Histogram */}
      <View style={styles.histogram}>
        {histogram.map(([grade, count]) => (
          <View key={grade} style={styles.histRow}>
            <Text style={styles.histGrade}>{grade}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' },
                ]}
              />
            </View>
            <Text style={styles.histCount}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Climbers CTA — visual only; tap is handled by the outer card */}
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
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avgStars: {
      fontFamily: theme.fonts.black,
      fontSize: 22,
      color: c.textPrimary,
    },
    feelText: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.accent,
    },
    separator: {
      fontSize: 14,
      color: c.textTertiary,
      marginHorizontal: 6,
    },
    modeGrade: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
    },
    histogram: {
      gap: 5,
      marginBottom: 12,
    },
    histRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    histGrade: {
      width: 44,
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textPrimary,
    },
    barTrack: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.backgroundSecondary,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: c.accent,
    },
    histCount: {
      width: 32,
      textAlign: 'right',
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
    climbersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    climbersText: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      flex: 1,
    },
  });
