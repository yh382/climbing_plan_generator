import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

import { gymCommunityApi, GymSessionItem, GymStats } from '../api';
import { useThemeColors } from '@/lib/useThemeColors';

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

function formatDuration(mins: number | undefined): string {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function GymActivityFeed({ gymId }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sessions, setSessions] = useState<GymSessionItem[]>([]);
  const [stats, setStats] = useState<GymStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activityData, statsData] = await Promise.all([
        gymCommunityApi.getActivity(gymId),
        gymCommunityApi.getStats(gymId),
      ]);
      setSessions(activityData.items);
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
        <ActivityIndicator size="small" color={colors.accent} />
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

      {/* Session List */}
      {sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="pulse-outline" size={40} color={colors.tertiaryLabel} />
          <Text style={styles.emptyText}>No sessions yet</Text>
          <Text style={styles.emptySubtext}>
            Sessions at this gym will appear here
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {sessions.map((item) => (
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
                    <Ionicons name="person" size={16} color={colors.tertiaryLabel} />
                  </View>
                )}
                <View style={styles.sessionInfo}>
                  <Text style={styles.username} numberOfLines={1}>
                    {item.display_name || item.username || 'Climber'}
                  </Text>
                  <Text style={styles.sessionDetail}>
                    {item.log_count} routes · {item.send_count} sends
                    {item.top_grade ? ` · Top ${item.top_grade}` : ''}
                    {item.duration_minutes ? ` · ${formatDuration(item.duration_minutes)}` : ''}
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

const createStyles = (c: ReturnType<typeof useThemeColors>) => StyleSheet.create({
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
    color: c.label,
  },
  emptySubtext: {
    fontSize: 13,
    color: c.tertiaryLabel,
    textAlign: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.separator,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: c.label,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.tertiaryLabel,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: c.label,
    marginBottom: 10,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: c.separator,
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
    backgroundColor: c.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: c.label,
  },
  sessionDetail: {
    fontSize: 13,
    color: c.secondaryLabel,
    marginTop: 1,
  },
  time: {
    fontSize: 12,
    color: c.tertiaryLabel,
    marginLeft: 8,
  },
});
