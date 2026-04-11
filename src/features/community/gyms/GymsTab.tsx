import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { useFavoriteGyms } from '../../gyms/hooks';
import { gymCommunityApi, GymStats } from '../../gyms/api';
import GymCommunityTabs from './GymCommunityTabs';
import GymDropdownPill from '../components/GymDropdownPill';
import GymSelectSheet from '../components/GymSelectSheet';

interface Props {
  initialGymId?: string;
}

export default function GymsTab({ initialGymId }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const sheetRef = useRef<TrueSheet>(null);
  const { favorites, loading: favLoading, refresh: refreshFav } = useFavoriteGyms();

  useFocusEffect(
    useCallback(() => {
      refreshFav();
    }, [refreshFav]),
  );

  const myGyms = useMemo(() => favorites, [favorites]);

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

  // Fetch stats for the selected gym
  const [gymStats, setGymStats] = useState<GymStats | null>(null);
  useEffect(() => {
    if (!selectedGymId) { setGymStats(null); return; }
    let cancelled = false;
    gymCommunityApi.getStats(selectedGymId).then((s) => {
      if (!cancelled) setGymStats(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedGymId]);

  const loading = favLoading;

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
          Favorite a gym from the map to see its community here.
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

  // Single gym — dropdown pill navigates to gym search
  if (myGyms.length === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.dropdownRow}>
          <GymDropdownPill
            gymName={myGyms[0].name}
            onPress={() => router.push('/gyms')}
            weeklyActive={gymStats?.weekly_active}
            totalSends={gymStats?.total_sends}
            gradeFeel={gymStats?.grade_feel ?? undefined}
          />
        </View>
        <GymCommunityTabs gymId={myGyms[0].gym_id} />
      </View>
    );
  }

  // Multiple gyms — dropdown pill + bottom sheet selector
  return (
    <View style={styles.container}>
      <View style={styles.dropdownRow}>
        <GymDropdownPill
          gymName={selectedGym?.name ?? ''}
          onPress={() => sheetRef.current?.present()}
          weeklyActive={gymStats?.weekly_active}
          totalSends={gymStats?.total_sends}
          gradeFeel={gymStats?.grade_feel ?? undefined}
        />
      </View>

      {selectedGym && <GymCommunityTabs gymId={selectedGym.gym_id} />}

      <GymSelectSheet
        sheetRef={sheetRef}
        gyms={myGyms}
        selectedGymId={selectedGymId}
        onSelect={(id) => setSelectedGymId(id)}
      />
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
  dropdownRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
