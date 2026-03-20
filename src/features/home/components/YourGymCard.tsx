import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useRecentGym, useFavoriteGyms } from '../../gyms/hooks';

const REFRESH_THROTTLE_MS = 60_000; // 1 minute

export default function YourGymSection() {
  const router = useRouter();
  const { recentGym, loading: recentLoading, refresh: refreshRecent } = useRecentGym();
  const { favorites, loading: favLoading, refresh: refreshFav } = useFavoriteGyms();
  const lastFetchRef = useRef(0);

  // Refresh when Home tab gains focus (throttled to avoid scroll jank)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchRef.current > REFRESH_THROTTLE_MS) {
        lastFetchRef.current = now;
        refreshRecent();
        refreshFav();
      }
    }, [refreshRecent, refreshFav]),
  );

  const loading = recentLoading || favLoading;
  if (loading) return null;

  const firstFav = favorites.length > 0 ? favorites[0] : null;
  const displayGym = recentGym ?? firstFav;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Gym</Text>

      {displayGym ? (
        <TouchableOpacity
          style={styles.gymCard}
          activeOpacity={0.7}
          onPress={() => router.push(`/gyms/${displayGym.gym_id}`)}
        >
          <View style={styles.gymCardLeft}>
            <View style={styles.gymIconWrap}>
              <Ionicons name="location" size={22} color="#306E6F" />
            </View>
            <View style={styles.gymInfo}>
              <Text style={styles.gymName} numberOfLines={1}>{displayGym.name}</Text>
              <Text style={styles.gymSub} numberOfLines={1}>
                {recentGym ? `Last session: ${recentGym.last_session_date}` : 'Favorited'}
              </Text>
            </View>
          </View>
          <View style={styles.gymCardRight}>
            {displayGym.is_favorited && (
              <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
            )}
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.emptyCard}
          activeOpacity={0.7}
          onPress={() => router.push('/gyms')}
        >
          <View style={styles.emptyIconWrap}>
            <Ionicons name="location-outline" size={26} color="#306E6F" />
          </View>
          <Text style={styles.emptyTitle}>Find Your Gym</Text>
          <Text style={styles.emptySub}>Explore nearby climbing gyms</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111',
  },

  // Gym card — matches Home card language (shadow, rounded, prominent)
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gymCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gymIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  gymInfo: {
    flex: 1,
  },
  gymName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  gymSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },
  gymCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Empty state — centered card (matches noPlanCard style)
  emptyCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
