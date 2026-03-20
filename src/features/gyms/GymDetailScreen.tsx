import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import CollapsibleLargeHeaderFlatList from '../../components/CollapsibleLargeHeaderFlatList';
import { useGymsStore } from '../../store/useGymsStore';
import { useGymFavoriteToggle } from './hooks';
import GymDashboardTab from './components/GymDashboardTab';
import GymActivityFeed from './components/GymActivityFeed';
import GymMemberList from './components/GymMemberList';

type Tab = 'dashboard' | 'activity' | 'members';

interface Props {
  gymId: string;
}

export default function GymDetailScreen({ gymId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('activity');

  const selectedGym = useGymsStore((s) => s.selectedGym);
  const gymName = selectedGym?.name || 'Gym Community';

  const { isFavorited, toggle: toggleFav } = useGymFavoriteToggle();
  const isFav = isFavorited(gymId);

  const handlePressUser = useCallback((userId: string) => {
    router.push(`/community/u/${userId}`);
  }, []);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'home-outline' },
    { key: 'activity', label: 'Activity', icon: 'pulse-outline' },
    { key: 'members', label: 'Members', icon: 'people-outline' },
  ];

  const listData = [{ key: 'content' }];

  const renderItem = useCallback(() => {
    switch (activeTab) {
      case 'dashboard':
        return <GymDashboardTab />;
      case 'activity':
        return <GymActivityFeed gymId={gymId} />;
      case 'members':
        return <GymMemberList gymId={gymId} onPressUser={handlePressUser} />;
      default:
        return null;
    }
  }, [activeTab, gymId, handlePressUser]);

  const tabBar = (
    <View style={styles.tabRow}>
      {tabs.map((t) => (
        <TouchableOpacity
          key={t.key}
          style={[styles.tab, activeTab === t.key && styles.tabActive]}
          onPress={() => setActiveTab(t.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={t.icon as any}
            size={16}
            color={activeTab === t.key ? '#306E6F' : '#9CA3AF'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === t.key && styles.tabTextActive,
            ]}
          >
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CollapsibleLargeHeaderFlatList
        backgroundColor="#FFFFFF"
        largeTitle={
          <Text style={styles.largeTitle} numberOfLines={2}>{gymName}</Text>
        }
        smallTitle={gymName}
        leftActions={
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={25} color="#111" />
          </TouchableOpacity>
        }
        rightActions={
          <TouchableOpacity
            onPress={() => toggleFav(gymId, () => {
              Alert.alert(
                'Joined Community!',
                `You are now a member of ${gymName}. You'll appear in the members list and rankings.`,
              );
            })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerBtn}
          >
            <Ionicons
              name={isFav ? 'star' : 'star-outline'}
              size={22}
              color={isFav ? '#F59E0B' : '#9CA3AF'}
            />
          </TouchableOpacity>
        }
        listHeader={tabBar}
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ paddingHorizontal: 0 }}
        bottomInsetExtra={28}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  largeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
    lineHeight: 34,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: 'rgba(48,110,111,0.1)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#306E6F',
  },
});
