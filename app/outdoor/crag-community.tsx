// app/outdoor/crag-community.tsx
// Layer 2.5: Crag Community — Activity feed + Rankings
// Reuses gym community patterns with area_id as data source

import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../src/lib/useThemeColors';
import { useSettings } from '../../src/contexts/SettingsContext';
import { HeaderButton } from '../../src/components/ui/HeaderButton';
import { NativeSegmentedControl } from '../../src/components/ui/NativeSegmentedControl';
import { theme } from '../../src/lib/theme';
import { BetaSegment } from '../../src/features/outdoor/components/BetaSegment';
import { ScrollEdgeFallback } from '@/components/shared/ScrollEdgeFallback';

// Mock data for community (backend will provide real data)
type ActivityItem = {
  id: string;
  username: string;
  avatar_url?: string;
  action: string; // 'send' | 'rate' | 'attempt'
  route_name: string;
  grade_text: string;
  detail?: string;
  date: string;
};

type RankingItem = {
  rank: number;
  username: string;
  avatar_url?: string;
  send_count: number;
  max_grade: string;
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: '1', username: 'alice', action: 'send', route_name: '鸭子', grade_text: '5.11b', detail: 'Redpoint · 3 att', date: '2026-04-14' },
  { id: '2', username: 'bob', action: 'rate', route_name: '月光宝盒', grade_text: '5.11c', detail: '★★★★★', date: '2026-04-14' },
  { id: '3', username: 'eve', action: 'attempt', route_name: '暗河', grade_text: '5.13a', detail: 'Project · 8 att', date: '2026-04-13' },
  { id: '4', username: 'charlie', action: 'send', route_name: '飞鸟', grade_text: '5.10c', detail: 'Flash', date: '2026-04-12' },
];

const MOCK_RANKINGS: RankingItem[] = [
  { rank: 1, username: 'alice', send_count: 45, max_grade: '5.13a' },
  { rank: 2, username: 'bob', send_count: 38, max_grade: '5.12c' },
  { rank: 3, username: 'eve', send_count: 30, max_grade: '5.12a' },
  { rank: 4, username: 'charlie', send_count: 22, max_grade: '5.11d' },
  { rank: 5, username: 'dave', send_count: 15, max_grade: '5.11b' },
];

export default function CragCommunityPage() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const { areaId, areaName } = useLocalSearchParams<{ areaId: string; areaName?: string }>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tabIndex, setTabIndex] = useState(0);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: areaName ? `${areaName} ${tr('社区', 'Community')}` : tr('攀岩区社区', 'Crag Community'),
          headerLeft: () => <HeaderButton icon="chevron.backward" onPress={router.back} />,
          // Smaller large-title font so long area names (e.g. "Little
          // Cottonwood Canyon 社区") fit on a single line instead of
          // truncating. Default iOS large-title is ~34pt.
          headerLargeTitleStyle: { fontSize: 24 },
          headerTitleStyle: { fontSize: 17 },
        }}
      />
      <ScrollEdgeFallback>
      <ScrollView style={styles.container} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.body}>
          <NativeSegmentedControl
            options={[tr('动态', 'Activity'), tr('排行榜', 'Rankings'), 'Beta']}
            selectedIndex={tabIndex}
            onSelect={setTabIndex}
            style={styles.segment}
          />

          {tabIndex === 0 ? (
            <ActivityTab colors={colors} tr={tr} />
          ) : tabIndex === 1 ? (
            <RankingsTab colors={colors} tr={tr} />
          ) : (
            <BetaSegment areaId={areaId ?? ''} />
          )}
        </View>
      </ScrollView>
      </ScrollEdgeFallback>
    </>
  );
}

function ActivityTab({ colors, tr }: { colors: ReturnType<typeof useThemeColors>; tr: (zh: string, en: string) => string }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const actionIcon = (action: string) => {
    if (action === 'send') return 'checkmark-circle';
    if (action === 'rate') return 'star';
    return 'refresh';
  };

  const actionColor = (action: string) => {
    if (action === 'send') return colors.accent;
    if (action === 'rate') return '#FFD60A';
    return colors.textSecondary;
  };

  return (
    <View style={styles.tabContent}>
      {MOCK_ACTIVITY.map((item) => (
        <View key={item.id} style={styles.activityRow}>
          {/* Avatar placeholder */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityText}>
              <Text style={styles.activityUser}>@{item.username}</Text>
              {' '}
              {item.action === 'send' ? tr('完成了', 'sent') : item.action === 'rate' ? tr('评价了', 'rated') : tr('尝试了', 'attempted')}
              {' '}
              <Text style={styles.activityRoute}>{item.route_name}</Text>
              {' '}
              <Text style={styles.activityGrade}>{item.grade_text}</Text>
            </Text>
            {item.detail && <Text style={styles.activityDetail}>{item.detail}</Text>}
            <Text style={styles.activityDate}>{item.date}</Text>
          </View>
          <Ionicons name={actionIcon(item.action) as any} size={18} color={actionColor(item.action)} />
        </View>
      ))}
    </View>
  );
}

function RankingsTab({ colors, tr }: { colors: ReturnType<typeof useThemeColors>; tr: (zh: string, en: string) => string }) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const medalColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.textTertiary;
  };

  return (
    <View style={styles.tabContent}>
      {MOCK_RANKINGS.map((item) => (
        <View key={item.rank} style={styles.rankRow}>
          <Text style={[styles.rankNum, { color: medalColor(item.rank) }]}>
            {item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `${item.rank}.`}
          </Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
          </View>
          <View style={styles.rankContent}>
            <Text style={styles.rankUser}>@{item.username}</Text>
            <Text style={styles.rankMeta}>
              {item.send_count} sends · {tr('最高', 'max')} {item.max_grade}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    body: { padding: theme.spacing.screenPadding },
    segment: { marginBottom: 16 },
    tabContent: { gap: 0 },

    // Activity
    activityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.cardBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      color: c.textSecondary,
    },
    activityContent: { flex: 1 },
    activityText: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textPrimary,
      lineHeight: 18,
    },
    activityUser: { fontFamily: theme.fonts.bold },
    activityRoute: { fontFamily: theme.fonts.medium },
    activityGrade: { fontFamily: theme.fonts.bold, color: c.accent },
    activityDetail: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    activityDate: {
      fontFamily: theme.fonts.regular,
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 2,
    },

    // Rankings
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rankNum: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      width: 28,
      textAlign: 'center',
    },
    rankContent: { flex: 1 },
    rankUser: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textPrimary,
    },
    rankMeta: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 1,
    },
  });
