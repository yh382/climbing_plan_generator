// src/components/shared/GradeSuggestionCard.tsx
// Climber summary card. Shared between outdoor + gym route detail.
//
// Shows ONLY data we actually have from /ascents: avg stars (server-side
// aggregate) + climber count + first climber name. Histogram + majority-feel
// were stripped (INDOOR_A device test, 2026-05-03) — the /ascents endpoint
// doesn't return suggested_grade or feel per-log, so those displays were
// always rendering placeholder values that looked like real aggregates.
// Resurrect them only after the endpoint adds those fields.

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
};

interface GradeSuggestionCardProps {
  logs: SendLog[];
  /** Server-side aggregate average stars. Preferred over deriving from logs. */
  avgStars?: number | null;
  /** Whole-card tap handler. If omitted, card is not pressable. */
  onPress?: () => void;
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
      {avgStars != null && (
        <View style={styles.topRow}>
          <Text style={styles.avgStars}>{avgStars.toFixed(1)}</Text>
          <Ionicons name="star" size={16} color="#FFD60A" style={{ marginLeft: 4 }} />
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
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    avgStars: {
      fontFamily: theme.fonts.black,
      fontSize: 22,
      color: c.textPrimary,
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
