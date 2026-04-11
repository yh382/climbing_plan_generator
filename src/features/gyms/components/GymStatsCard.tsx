import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { gymCommunityApi, GymStats } from '../api';
import { useThemeColors } from '@/lib/useThemeColors';

interface Props {
  gymId: string;
}

type DistType = 'boulder' | 'rope';

export default function GymStatsCard({ gymId }: Props) {
  const c = useThemeColors();
  const scheme = useColorScheme();
  // Soft accent tint for the KPI surface and distribution bar tracks.
  // Neutral grays (#F7F7F7 / #2C2C2E) read as flat and slightly harsh
  // against the liquid-glass sheet; a low-alpha accent tint is gentler
  // on the eye and ties both surfaces back to the brand color.
  const softBg =
    scheme === 'dark' ? 'rgba(48,110,111,0.14)' : 'rgba(48,110,111,0.06)';
  // Divider sits on top of softBg, so it needs slightly more opacity
  // to remain visible without looking like a hard line.
  const softDivider =
    scheme === 'dark' ? 'rgba(48,110,111,0.28)' : 'rgba(48,110,111,0.18)';
  const styles = useMemo(
    () => createStyles(c, softBg, softDivider),
    [c, softBg, softDivider],
  );

  const [stats, setStats] = useState<GymStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [distType, setDistType] = useState<DistType>('boulder');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gymCommunityApi.getStats(gymId);
      setStats(data);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={c.accent} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="stats-chart-outline" size={40} color={c.textTertiary} />
        <Text style={styles.emptyText}>No stats available</Text>
      </View>
    );
  }

  const distribution =
    distType === 'boulder'
      ? stats.boulder_distribution
      : stats.rope_distribution;

  const maxCount = distribution.reduce((m, d) => Math.max(m, d.count), 1);

  return (
    <View style={styles.container}>
      {/* KPI row — single merged card with vertical dividers between
          the three metrics. Visually distinct from the three action
          buttons above (which are separate pills). */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>
            {stats.total_sends.toLocaleString()}
          </Text>
          <Text style={styles.kpiLabel}>Total Sends</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.unique_users}</Text>
          <Text style={styles.kpiLabel}>Climbers</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiCell}>
          <Text style={styles.kpiValue}>{stats.weekly_active}</Text>
          <Text style={styles.kpiLabel}>Weekly Active</Text>
        </View>
      </View>

      {/* Popular grades */}
      {stats.popular_grades.length > 0 && (
        <View style={styles.popularRow}>
          <Text style={styles.popularLabel}>Popular grades:</Text>
          <Text style={styles.popularValue}>
            {stats.popular_grades.join(', ')}
          </Text>
        </View>
      )}

      {/* Distribution toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.pill, distType === 'boulder' && styles.pillActive]}
          onPress={() => setDistType('boulder')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.pillText,
              distType === 'boulder' && styles.pillTextActive,
            ]}
          >
            Boulder
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, distType === 'rope' && styles.pillActive]}
          onPress={() => setDistType('rope')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.pillText,
              distType === 'rope' && styles.pillTextActive,
            ]}
          >
            Rope
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grade distribution bars */}
      {distribution.length === 0 ? (
        <Text style={styles.noDistText}>No {distType} data yet</Text>
      ) : (
        <View style={styles.distContainer}>
          {distribution.map((d) => (
            <View key={d.grade_text} style={styles.barRow}>
              <Text style={styles.barLabel}>{d.grade_text}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(d.count / maxCount) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barCount}>{d.count}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (
  c: ReturnType<typeof useThemeColors>,
  softBg: string,
  softDivider: string,
) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    loadingWrap: {
      padding: 40,
      alignItems: 'center',
    },
    emptyWrap: {
      padding: 40,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    // Merged KPI card. Low-alpha accent tint reads softer than a flat
    // neutral gray against the liquid-glass sheet, and echoes the brand
    // color in both light & dark mode.
    kpiRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: softBg,
      borderRadius: 12,
      paddingVertical: 14,
      marginBottom: 16,
    },
    kpiCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: softDivider,
      marginVertical: 4,
    },
    kpiValue: {
      fontSize: 20,
      fontWeight: '800',
      color: c.textPrimary,
    },
    kpiLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
      marginTop: 2,
    },
    popularRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    popularLabel: {
      fontSize: 13,
      color: c.textSecondary,
      marginRight: 6,
    },
    popularValue: {
      fontSize: 13,
      fontWeight: '700',
      color: c.accent,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 12,
    },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.backgroundSecondary,
    },
    pillActive: {
      backgroundColor: c.pillBackground,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
    },
    pillTextActive: {
      color: c.pillText,
    },
    noDistText: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      paddingVertical: 20,
    },
    distContainer: {
      gap: 6,
    },
    barRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    barLabel: {
      width: 50,
      fontSize: 13,
      fontWeight: '700',
      color: c.textPrimary,
      textAlign: 'right',
      marginRight: 10,
    },
    barTrack: {
      flex: 1,
      height: 20,
      backgroundColor: softBg,
      borderRadius: 10,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      backgroundColor: c.accent,
      borderRadius: 10,
    },
    barCount: {
      width: 36,
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      textAlign: 'right',
      marginLeft: 8,
    },
  });
