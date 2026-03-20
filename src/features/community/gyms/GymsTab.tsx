import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import GymCard from '../../../components/shared/GymCard';
import { useRecentGym, useFavoriteGyms, usePopularGyms } from '../../gyms/hooks';
import { GymSummary } from '../../gyms/api';

export default function GymsTab() {
  const router = useRouter();
  const { recentGym, loading: recentLoading, refresh: refreshRecent } = useRecentGym();
  const { favorites, loading: favLoading, toggleFavorite, refresh: refreshFav } = useFavoriteGyms();
  const { popularGyms, loading: popLoading, refresh: refreshPop } = usePopularGyms();

  // Refresh all data when this screen gains focus
  useFocusEffect(
    useCallback(() => {
      refreshRecent();
      refreshFav();
      refreshPop();
    }, [refreshRecent, refreshFav, refreshPop]),
  );

  // Merge recent gym into favorites: pin it first, de-dup
  const myGyms = useMemo(() => {
    const result: GymSummary[] = [];
    const seen = new Set<string>();

    // Recent gym first (if it exists and is favorited — or even if not, show it at top)
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

    // Then the rest of favorites
    for (const fav of favorites) {
      if (!seen.has(fav.gym_id)) {
        result.push(fav);
        seen.add(fav.gym_id);
      }
    }

    return result;
  }, [recentGym, favorites]);

  // Filter popular gyms to exclude ones already in "My Gyms"
  const filteredPopular = useMemo(() => {
    const myIds = new Set(myGyms.map(g => g.gym_id));
    return popularGyms.filter(g => !myIds.has(g.gym_id));
  }, [myGyms, popularGyms]);

  const loading = recentLoading || favLoading || popLoading;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#306E6F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* My Gyms section */}
      {myGyms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Gyms</Text>
          {myGyms.map((gym, idx) => (
            <GymCard
              key={gym.gym_id}
              gymId={gym.gym_id}
              name={gym.name}
              subtitle={
                recentGym && gym.gym_id === recentGym.gym_id
                  ? `Last session: ${recentGym.last_session_date}`
                  : gym.weekly_active > 0
                    ? `${gym.weekly_active} active this week`
                    : undefined
              }
              isFavorited={gym.is_favorited}
              onPress={() => router.push(`/gyms/${gym.gym_id}`)}
              onToggleFavorite={() => toggleFavorite(gym.gym_id, gym.is_favorited)}
              variant="full"
            />
          ))}
        </View>
      )}

      {/* Popular section */}
      {filteredPopular.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Gyms</Text>
          {filteredPopular.map((gym) => (
            <GymCard
              key={gym.gym_id}
              gymId={gym.gym_id}
              name={gym.name}
              subtitle={
                gym.weekly_active > 0
                  ? `${gym.weekly_active} active this week`
                  : `${gym.total_sends} total sends`
              }
              isFavorited={gym.is_favorited}
              onPress={() => router.push(`/gyms/${gym.gym_id}`)}
              onToggleFavorite={() => toggleFavorite(gym.gym_id, gym.is_favorited)}
              variant="full"
            />
          ))}
        </View>
      )}

      {/* Empty state */}
      {myGyms.length === 0 && filteredPopular.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No gyms yet</Text>
          <Text style={styles.emptySub}>
            Log a session at a gym to see it here, or explore the map to find gyms nearby.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  emptyWrap: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
