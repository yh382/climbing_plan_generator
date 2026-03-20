import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { gymCommunityApi, GymLogItem, GymStats } from '../api';

interface Props {
  gymId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const RESULT_LABELS: Record<string, string> = {
  flash: 'Flash',
  onsight: 'Onsight',
  send: 'Send',
  attempt: 'Attempt',
};

const WALL_LABELS: Record<string, string> = {
  boulder: 'Boulder',
  toprope: 'Top Rope',
  lead: 'Lead',
  trad: 'Trad',
};

export default function GymActivityFeed({ gymId }: Props) {
  const [logs, setLogs] = useState<GymLogItem[]>([]);
  const [stats, setStats] = useState<GymStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activityData, statsData] = await Promise.all([
        gymCommunityApi.getActivity(gymId),
        gymCommunityApi.getStats(gymId),
      ]);
      setLogs(activityData.items);
      setStats(statsData);
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#306E6F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* KPI Row */}
      {stats && (
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>
              {stats.total_sends.toLocaleString()}
            </Text>
            <Text style={styles.kpiLabel}>Total Sends</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.weekly_active}</Text>
            <Text style={styles.kpiLabel}>Weekly Active</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{stats.difficulty_index.toFixed(2)}</Text>
            <Text style={styles.kpiLabel}>Difficulty</Text>
          </View>
        </View>
      )}

      {/* Log List */}
      {logs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="pulse-outline" size={40} color="#D1D5DB" />
          <Text style={styles.emptyText}>No activity yet</Text>
          <Text style={styles.emptySubtext}>
            Climb logs at this gym will appear here
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Recent Climbs</Text>
          {logs.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/community/u/${item.user_id}`)}
            >
              <View style={styles.row}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={16} color="#9CA3AF" />
                  </View>
                )}
                <View style={styles.logInfo}>
                  <Text style={styles.username} numberOfLines={1}>
                    {item.username || 'Climber'}
                  </Text>
                  <Text style={styles.logDetail}>
                    <Text style={styles.grade}>{item.grade_text}</Text>
                    {' · '}
                    {RESULT_LABELS[item.result] || item.result}
                    {' · '}
                    {WALL_LABELS[item.wall_type] || item.wall_type}
                  </Text>
                </View>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
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
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // KPI
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

  // Log list
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  logDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  grade: {
    fontWeight: '800',
    color: '#306E6F',
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
});
