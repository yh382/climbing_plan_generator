import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderButton } from '@/components/ui/HeaderButton';

import CollapsibleLargeHeaderFlatList from '../../components/CollapsibleLargeHeaderFlatList';
import { useGymsStore } from '../../store/useGymsStore';
import { useGymFavoriteToggle } from './hooks';
import GymDashboardTab from './components/GymDashboardTab';
import GymActivityFeed from './components/GymActivityFeed';
import GymMemberList from './components/GymMemberList';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';

type Tab = 'dashboard' | 'activity' | 'members';

interface Props {
  gymId: string;
}

export default function GymDetailScreen({ gymId }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            color={activeTab === t.key ? '#FFFFFF' : colors.textTertiary}
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
          <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
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
              color={isFav ? '#F59E0B' : colors.textTertiary}
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  largeTitle: {
    fontSize: 28,
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.cardDark,
  },
  tabText: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
