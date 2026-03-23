import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { communityApi } from '@/features/community/api';
import type { RecommendedUser } from './api';

interface Props {
  user: RecommendedUser;
  onPress: (userId: string) => void;
}

export default function UserRecommendCard({ user, onPress }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = useCallback(async () => {
    setLoading(true);
    const next = !following;
    setFollowing(next);

    try {
      if (next) {
        await communityApi.followUser(user.user_id);
      } else {
        await communityApi.unfollowUser(user.user_id);
      }
    } catch {
      setFollowing(!next);
    } finally {
      setLoading(false);
    }
  }, [following, user.user_id]);

  const statsText = [
    user.boulder_max,
    user.total_sends > 0 ? `${user.total_sends} sends` : null,
  ].filter(Boolean).join(' · ') || '—';

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(user.user_id)} activeOpacity={0.7}>
      {user.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={16} color="#9CA3AF" />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
        <Text style={styles.stats} numberOfLines={1}>{statsText}</Text>
      </View>

      <TouchableOpacity
        style={[styles.followBtn, following && styles.followBtnActive]}
        onPress={handleFollow}
        disabled={loading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={following ? colors.textSecondary : '#FFF'} />
        ) : (
          <Text style={[styles.followText, following && styles.followTextActive]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  stats: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },
  followBtn: {
    backgroundColor: colors.cardDark,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 80,
    alignItems: 'center',
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: '#FFF',
  },
  followTextActive: {
    color: colors.textSecondary,
  },
});
