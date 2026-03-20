import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { gymCommunityApi, GymStats } from '../api';

interface Props {
  gymId: string;
}

type DistType = 'boulder' | 'rope';

export default function GymStatsCard({ gymId }: Props) {
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
        <ActivityIndicator size="small" color="#306E6F" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="stats-chart-outline" size={40} color="#D1D5DB" />
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
      {/* KPI row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {stats.total_sends.toLocaleString()}
          </Text>
          <Text style={styles.kpiLabel}>Total Sends</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{stats.unique_users}</Text>
          <Text style={styles.kpiLabel}>Climbers</Text>
        </View>
        <View style={styles.kpiCard}>
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
        <Text style={styles.noDistText}>
          No {distType} data yet
        </Text>
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

const styles = StyleSheet.create({
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
    color: '#374151',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
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
    color: '#9CA3AF',
    marginRight: 6,
  },
  popularValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#306E6F',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  pillActive: {
    backgroundColor: '#111',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  pillTextActive: {
    color: '#FFF',
  },
  noDistText: {
    fontSize: 13,
    color: '#9CA3AF',
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
    color: '#374151',
    textAlign: 'right',
    marginRight: 10,
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#306E6F',
    borderRadius: 10,
  },
  barCount: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'right',
    marginLeft: 8,
  },
});
