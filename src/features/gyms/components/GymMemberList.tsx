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

import { theme } from '../../../lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { gymCommunityApi, GymMember, GymStaffMember } from '../api';
import { useLeaderboard } from '../../community/hooks';
import { useSettings } from '@/contexts/SettingsContext';

interface Props {
  gymId: string;
  onPressUser?: (userId: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function GymMemberList({ gymId, onPressUser }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();

  const [members, setMembers] = useState<GymMember[]>([]);
  const [total, setTotal] = useState(0);
  const [membersLoading, setMembersLoading] = useState(true);
  const [staff, setStaff] = useState<GymStaffMember[]>([]);
  const [staffExpanded, setStaffExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    gymCommunityApi.getStaff(gymId).then((s) => alive && setStaff(s)).catch(() => {});
    return () => { alive = false; };
  }, [gymId]);

  const staffLabel = (s: GymStaffMember) =>
    s.is_head_setter ? tr('主力定线员', 'Head setter')
    : s.is_setter ? tr('定线员', 'Setter')
    : s.role === 'owner' ? tr('馆主', 'Owner') : s.role;

  const { items: rankItems, loading: rankLoading } = useLeaderboard('total', 'gym', gymId, 10);

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const data = await gymCommunityApi.getMembers(gymId);
      setMembers(data.items);
      setTotal(data.total);
    } catch {
      // swallow
    } finally {
      setMembersLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const loading = membersLoading || rankLoading;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Staff Section (P2-C) — official owner + setters, collapsed by default */}
      {staff.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.sectionHeader}
            onPress={() => setStaffExpanded((e) => !e)}
          >
            <Text style={styles.sectionTitle}>
              {tr('官方团队', 'Staff')} ({staff.length})
            </Text>
            <Ionicons
              name={staffExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {staffExpanded && (
            <View style={styles.rankCard}>
              {staff.map((s) => (
                <TouchableOpacity
                  key={s.user_id}
                  style={styles.rankRow}
                  activeOpacity={0.7}
                  onPress={() => onPressUser?.(s.user_id)}
                >
                  {s.avatar_url ? (
                    <Image source={{ uri: s.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={16} color={colors.textTertiary} />
                    </View>
                  )}
                  <Text style={[styles.username, { flex: 1, marginLeft: 10 }]} numberOfLines={1}>
                    {s.display_name || s.username || tr('攀岩者', 'Climber')}
                  </Text>
                  <View style={styles.staffBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
                    <Text style={styles.staffBadgeText}>{staffLabel(s)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Rankings Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gym Rankings</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/community/rank', params: { gymId } } as any)}
        >
          <Text style={styles.viewAll}>All</Text>
        </TouchableOpacity>
      </View>

      {rankItems.length === 0 ? (
        <View style={styles.emptyRank}>
          <Ionicons name="trophy-outline" size={32} color={colors.textTertiary} />
          <Text style={styles.emptySmallText}>No rankings yet</Text>
        </View>
      ) : (
        <View style={styles.rankCard}>
          {rankItems.map((item) => {
            const isTop3 = item.rank <= 3;
            return (
              <TouchableOpacity
                key={item.userId}
                style={styles.rankRow}
                activeOpacity={0.7}
                onPress={() => onPressUser?.(item.userId)}
              >
                <View style={styles.rankCol}>
                  {isTop3 ? (
                    <View
                      style={[
                        styles.medal,
                        { backgroundColor: MEDAL_COLORS[item.rank - 1] },
                      ]}
                    >
                      <Text style={styles.medalText}>{item.rank}</Text>
                    </View>
                  ) : (
                    <Text style={styles.rankText}>{item.rank}</Text>
                  )}
                </View>

                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={16} color={colors.textTertiary} />
                  </View>
                )}

                <Text style={styles.username} numberOfLines={1}>
                  {item.username}
                </Text>

                <Text style={styles.score}>
                  {Math.round(item.score).toLocaleString()} pts
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Members Section */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Members ({total})</Text>
      </View>

      {members.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No members yet</Text>
          <Text style={styles.emptySubtext}>
            Favorite this gym to become a member!
          </Text>
        </View>
      ) : (
        members.map((m) => (
          <TouchableOpacity
            key={m.user_id}
            style={styles.memberRow}
            activeOpacity={0.7}
            onPress={() => onPressUser?.(m.user_id)}
          >
            {m.avatar_url ? (
              <Image source={{ uri: m.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color={colors.textTertiary} />
              </View>
            )}
            <View style={styles.memberInfo}>
              <Text style={styles.username} numberOfLines={1}>
                {m.username || 'Climber'}
              </Text>
              {m.joined_at && (
                <Text style={styles.joinDate}>
                  Member since {formatDate(m.joined_at)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
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
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyRank: {
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptySmallText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.accent,
  },

  // Rank card
  rankCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textSecondary,
  },
  medal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: theme.fonts.black,
    color: '#FFF',
  },

  // Shared
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  score: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  staffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48,110,111,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  staffBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: '#1D4E4E',
  },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  memberInfo: {
    flex: 1,
  },
  joinDate: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
