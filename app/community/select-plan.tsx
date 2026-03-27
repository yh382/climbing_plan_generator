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
import { plansApi } from '../../src/features/plans/api';
import { fireAttachmentCallback } from '../../src/features/community/pendingAttachment';

type PlanItem = {
  id: string;
  title?: string;
  duration_weeks?: number;
  sessions_per_week?: number;
  training_type?: string;
  status?: string;
};

export default function SelectPlanScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await plansApi.getMyPlans();
        setPlans(res || []);
      } catch (e: any) {
        if (__DEV__) console.warn('loadPlans error:', e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = (item: PlanItem) => {
    const weeks = item.duration_weeks ? `${item.duration_weeks} weeks` : '';
    const sessions = item.sessions_per_week ? `${item.sessions_per_week} sessions/wk` : '';
    const type = item.training_type || '';
    const subtitle = [weeks, sessions, type].filter(Boolean).join(' · ');

    fireAttachmentCallback({
      id: item.id,
      type: 'plan',
      title: item.title || 'Untitled Plan',
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
        data={plans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isActive = item.status === 'active';
          const weeks = item.duration_weeks ? `${item.duration_weeks} weeks` : '';
          const sessions = item.sessions_per_week ? `${item.sessions_per_week} sessions/wk` : '';

          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title || 'Untitled Plan'}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {[weeks, sessions].filter(Boolean).join(' · ') || item.training_type || 'Plan'}
                </Text>
              </View>

              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Active</Text>
                </View>
              )}

              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No plans yet</Text>
          </View>
        }
        contentContainerStyle={plans.length === 0 ? { flex: 1 } : undefined}
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
  activeBadge: {
    backgroundColor: 'rgba(48,110,111,0.12)',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginRight: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: '#306E6F',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
});
