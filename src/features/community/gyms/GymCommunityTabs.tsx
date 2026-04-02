import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/lib/useThemeColors';
import { NativeSegmentedControl } from '@/components/ui';
import GymDashboardTab from '../../gyms/components/GymDashboardTab';
import GymActivityFeed from '../../gyms/components/GymActivityFeed';
import GymMemberList from '../../gyms/components/GymMemberList';
import GymPostsView from './GymPostsView';

type GymTab = 'Dashboard' | 'Activity' | 'Members';
type ActivitySubTab = 'Sessions' | 'Posts';

const GYM_TABS: GymTab[] = ['Dashboard', 'Activity', 'Members'];
const ACTIVITY_SUB_TABS: ActivitySubTab[] = ['Sessions', 'Posts'];

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
  const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('Sessions');

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

      {activeTab === 'Activity' && (
        <View>
          {/* Sub-tab switcher — native segmented control */}
          <View style={styles.subSegmentWrap}>
            <NativeSegmentedControl
              options={ACTIVITY_SUB_TABS}
              selectedIndex={ACTIVITY_SUB_TABS.indexOf(activitySubTab)}
              onSelect={(i) => setActivitySubTab(ACTIVITY_SUB_TABS[i])}
              style={{ width: 200, height: 28 }}
            />
          </View>

          {activitySubTab === 'Sessions' && <GymActivityFeed gymId={gymId} />}
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
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  subSegmentWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
});
