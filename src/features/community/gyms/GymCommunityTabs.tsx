import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/lib/useThemeColors';
import { NativeSegmentedControl } from '@/components/ui';
import GymDashboardTab from '../../gyms/components/GymDashboardTab';
import GymActivityFeed from '../../gyms/components/GymActivityFeed';
import GymMemberList from '../../gyms/components/GymMemberList';
import GymPostsView from './GymPostsView';

type GymTab = 'Dashboard' | 'Sessions' | 'Activity' | 'Members';

const GYM_TABS: GymTab[] = ['Dashboard', 'Sessions', 'Activity', 'Members'];

interface Props {
  gymId: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function GymCommunityTabs({ gymId, isFavorited, onToggleFavorite }: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<GymTab>('Dashboard');

  return (
    <View style={styles.container}>
      {/* Main tab bar — native segmented control */}
      <View style={styles.segmentWrap}>
        <NativeSegmentedControl
          options={GYM_TABS}
          selectedIndex={GYM_TABS.indexOf(activeTab)}
          onSelect={(i) => setActiveTab(GYM_TABS[i])}
        />
      </View>

      {/* Tab content */}
      {activeTab === 'Dashboard' && (
        <GymDashboardTab isFavorited={isFavorited} onToggleFavorite={onToggleFavorite} />
      )}

      {activeTab === 'Sessions' && <GymActivityFeed gymId={gymId} />}

      {activeTab === 'Activity' && <GymPostsView gymId={gymId} />}

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
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
});
