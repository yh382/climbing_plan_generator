import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import GymDashboardTab from '../../gyms/components/GymDashboardTab';
import GymActivityFeed from '../../gyms/components/GymActivityFeed';
import GymMemberList from '../../gyms/components/GymMemberList';
import GymPostsView from './GymPostsView';

type GymTab = 'Dashboard' | 'Activity' | 'Members';
type ActivitySubTab = 'Climb Logs' | 'Posts';

interface Props {
  gymId: string;
}

export default function GymCommunityTabs({ gymId }: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<GymTab>('Dashboard');
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('Climb Logs');

  const tabs: GymTab[] = ['Dashboard', 'Activity', 'Members'];

  return (
    <View style={styles.container}>
      {/* Main tab bar */}
      <View style={styles.tabRow}>
        {tabs.map(t => {
          const active = activeTab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === 'Dashboard' && <GymDashboardTab />}

      {activeTab === 'Activity' && (
        <View>
          {/* Sub-tab switcher */}
          <View style={styles.subTabRow}>
            {(['Climb Logs', 'Posts'] as ActivitySubTab[]).map(st => {
              const active = activitySubTab === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.subTab, active && styles.subTabActive]}
                  onPress={() => setActivitySubTab(st)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.subTabText, active && styles.subTabTextActive]}>{st}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {activitySubTab === 'Climb Logs' && <GymActivityFeed gymId={gymId} />}
          {activitySubTab === 'Posts' && <GymPostsView gymId={gymId} />}
        </View>
      )}

      {activeTab === 'Members' && (
        <GymMemberList
          gymId={gymId}
          onPressUser={(userId) => router.push(`/community/u/${userId}`)}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.cardDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
  },
  subTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  subTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  subTabActive: {
    backgroundColor: colors.cardDark,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  subTabTextActive: {
    color: '#FFF',
  },
});
