import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/lib/theme';
import { useThemeColors } from '../../src/lib/useThemeColors';
import { api } from '../../src/lib/apiClient';
import { fireAttachmentCallback } from '../../src/features/community/pendingAttachment';

type SessionItem = {
  id: string;
  title?: string;
  name?: string;
  session_type?: string;
  gym_name?: string;
  start_time?: string;
  sends_count?: number;
  best_grade?: string;
  duration_minutes?: number;
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDuration(min?: number) {
  if (!min) return '';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

export default function SelectSessionScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<any[]>('/sessions/me?limit=20');
        setSessions(res || []);
      } catch (e: any) {
        if (__DEV__) console.warn('loadSessions error:', e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = (item: SessionItem) => {
    const gymName = item.gym_name || '';
    const date = formatDate(item.start_time);
    const sends = item.sends_count != null ? `${item.sends_count} sends` : '';
    const grade = item.best_grade || '';
    const dur = formatDuration(item.duration_minutes);
    const subtitle = [sends, grade, dur].filter(Boolean).join(' · ');

    fireAttachmentCallback({
      id: item.id,
      type: 'session',
      title: [gymName, date].filter(Boolean).join(' · '),
      subtitle,
    });
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const date = formatDate(item.start_time);
          const gymName = item.gym_name || '';
          const sends = item.sends_count != null ? `${item.sends_count} sends` : '';
          const grade = item.best_grade || '';

          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {date || item.title || 'Session'}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {[gymName, sends, grade].filter(Boolean).join(' · ') || item.session_type || 'Training'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No sessions yet</Text>
          </View>
        }
        contentContainerStyle={sessions.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderTertiary,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
});
