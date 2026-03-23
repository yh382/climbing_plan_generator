import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { useRecentGym, useFavoriteGyms } from '../../gyms/hooks';
import { GymSummary } from '../../gyms/api';
import GymCommunityTabs from './GymCommunityTabs';

interface Props {
  initialGymId?: string;
}

export default function GymsTab({ initialGymId }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { recentGym, loading: recentLoading, refresh: refreshRecent } = useRecentGym();
  const { favorites, loading: favLoading, refresh: refreshFav } = useFavoriteGyms();

  useFocusEffect(
    useCallback(() => {
      refreshRecent();
      refreshFav();
    }, [refreshRecent, refreshFav]),
  );

  // Merge recent gym + favorites, de-dup
  const myGyms = useMemo(() => {
    const result: GymSummary[] = [];
    const seen = new Set<string>();
    if (recentGym) {
      result.push({
        gym_id: recentGym.gym_id,
        name: recentGym.name,
        place_id: recentGym.place_id,
        is_favorited: recentGym.is_favorited,
        weekly_active: 0,
        total_sends: 0,
      });
      seen.add(recentGym.gym_id);
    }
    for (const fav of favorites) {
      if (!seen.has(fav.gym_id)) {
        result.push(fav);
        seen.add(fav.gym_id);
      }
    }
    return result;
  }, [recentGym, favorites]);

  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  // Set initial selection from route param or first gym
  useEffect(() => {
    if (initialGymId) {
      const found = myGyms.find(g => g.gym_id === initialGymId);
      if (found) {
        setSelectedGymId(found.gym_id);
        return;
      }
    }
    if (myGyms.length > 0 && !selectedGymId) {
      setSelectedGymId(myGyms[0].gym_id);
    }
  }, [initialGymId, myGyms, selectedGymId]);

  const selectedGym = useMemo(
    () => myGyms.find(g => g.gym_id === selectedGymId) || null,
    [myGyms, selectedGymId],
  );

  const loading = recentLoading || favLoading;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  // Empty state
  if (myGyms.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="business-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No gyms yet</Text>
        <Text style={styles.emptySub}>
          Log a session at a gym or explore the map to find gyms nearby.
        </Text>
        <TouchableOpacity
          style={styles.findBtn}
          onPress={() => router.push('/gyms')}
          activeOpacity={0.8}
        >
          <Text style={styles.findBtnText}>Find a Gym</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Single gym — show name directly
  if (myGyms.length === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.singleHeader}>
          <Text style={styles.gymName}>{myGyms[0].name}</Text>
        </View>
        <GymCommunityTabs gymId={myGyms[0].gym_id} />
      </View>
    );
  }

  // Multiple gyms — pill switcher
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {myGyms.map(g => {
          const active = g.gym_id === selectedGymId;
          return (
            <TouchableOpacity
              key={g.gym_id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setSelectedGymId(g.gym_id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                {g.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={styles.addPill}
          onPress={() => router.push('/gyms')}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={18} color={colors.textSecondary} />
          <Text style={styles.addPillText}>Add</Text>
        </TouchableOpacity>
      </ScrollView>

      {selectedGym && <GymCommunityTabs gymId={selectedGym.gym_id} />}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: '#374151',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  findBtn: {
    marginTop: 12,
    backgroundColor: colors.cardDark,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  findBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: '#FFF',
  },
  singleHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  gymName: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
  },
  pillRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  pillActive: {
    backgroundColor: colors.cardDark,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFF',
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  addPillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
});
