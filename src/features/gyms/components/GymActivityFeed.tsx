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

import { gymCommunityApi, GymSessionItem } from '../api';
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
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const activityData = await gymCommunityApi.getActivity(gymId);
      setSessions(activityData.items);
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
      {/* Session List */}
      {sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="pulse-outline" size={40} color={colors.textTertiary} />
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
                    <Ionicons name="person" size={16} color={colors.textTertiary} />
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
    paddingHorizontal: 22,
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
  emptySubtext: {
    fontSize: 13,
    color: c.textTertiary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: c.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: c.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
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
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  sessionDetail: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: c.textTertiary,
    marginLeft: 8,
  },
});
