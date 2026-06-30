import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/lib/useThemeColors';
import { useSettings } from '@/contexts/SettingsContext';
import { NativeSegmentedControl } from '@/components/ui';
import GymDashboardTab from '../../gyms/components/GymDashboardTab';
import GymMemberList from '../../gyms/components/GymMemberList';
import GymPostsView from './GymPostsView';

// P2-G2 — consolidated 4→3 tabs. The old "Sessions" (session summaries) +
// "Activity" (posts) were redundant → one "Activity" feed. "Members" → "People"
// (Rankings + Phase-2 Staff).
type GymTab = 'Dashboard' | 'Activity' | 'People';
const GYM_TABS: GymTab[] = ['Dashboard', 'Activity', 'People'];

interface Props {
  gymId: string;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function GymCommunityTabs({ gymId, isFavorited, onToggleFavorite }: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState<GymTab>('Dashboard');

  const labels = [tr('主页', 'Dashboard'), tr('动态', 'Activity'), tr('成员', 'People')];

  return (
    <View style={styles.container}>
      <View style={styles.segmentWrap}>
        <NativeSegmentedControl
          options={labels}
          selectedIndex={GYM_TABS.indexOf(activeTab)}
          onSelect={(i) => setActiveTab(GYM_TABS[i])}
        />
      </View>

      {activeTab === 'Dashboard' && (
        <GymDashboardTab isFavorited={isFavorited} onToggleFavorite={onToggleFavorite} />
      )}

      {activeTab === 'Activity' && <GymPostsView gymId={gymId} />}

      {activeTab === 'People' && (
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
