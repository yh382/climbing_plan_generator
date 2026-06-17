import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Platform,
  StyleSheet,
  Alert,
  Linking,
  ActionSheetIOS,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';

import type { GymPlace } from '../../../../lib/poi/types';
import { gymCommunityApi } from '../api';
import GymStatsCard from './GymStatsCard';
import { useThemeColors } from '@/lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import {
  PlaceSheetActions,
  PlaceSheetHero,
  PlaceSheetIdentity,
  type PlaceSheetAction,
} from '../../../components/shared/placeSheet';

interface GymDetailCardProps {
  gym: GymPlace;
  onClose: () => void;
  /** Resolved internal gym_id, lifted up to the parent so the footer
   *  (favorite + share) can react to it without re-running ensureGym. */
  onGymIdResolved?: (gymId: string) => void;
}

export function GymDetailCard({
  gym,
  onClose,
  onGymIdResolved,
}: GymDetailCardProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [gymId, setGymId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  // Resolve the internal gym_id from the Google place_id as soon as the card
  // mounts. Unlocks GymStatsCard and the parent's favorite/share footer.
  useEffect(() => {
    let cancelled = false;
    setGymId(null);
    gymCommunityApi
      .ensureGym(gym.place_id)
      .then((r) => {
        if (cancelled) return;
        setGymId(r.gym_id);
        onGymIdResolved?.(r.gym_id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gym.place_id, onGymIdResolved]);

  const handleViewCommunity = useCallback(async () => {
    setNavigating(true);
    try {
      const id =
        gymId ?? (await gymCommunityApi.ensureGym(gym.place_id)).gym_id;
      onClose();
      router.push({
        pathname: '/gym-community',
        params: { gymId: id, gymName: gym.name },
      });
    } catch {
      Alert.alert('Error', 'Could not load gym page');
    } finally {
      setNavigating(false);
    }
  }, [gym.place_id, gym.name, gymId, onClose]);

  const handleViewFloorPlan = useCallback(async () => {
    setNavigating(true);
    try {
      const id =
        gymId ?? (await gymCommunityApi.ensureGym(gym.place_id)).gym_id;
      onClose();
      router.push(`/gym/${id}` as any);
    } catch {
      Alert.alert('Error', 'Could not load gym page');
    } finally {
      setNavigating(false);
    }
  }, [gym.place_id, gymId, onClose]);

  const handleNavigate = useCallback(async () => {
    const { lat, lng } = gym.location;
    const label = encodeURIComponent(gym.name);

    if (Platform.OS === 'android') {
      const gNav = `google.navigation:q=${lat},${lng}`;
      const gDir = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const url = (await Linking.canOpenURL(gNav)) ? gNav : gDir;
      Alert.alert('Open Navigation?', '即将打开 Google Maps 进行导航', [
        { text: '取消', style: 'cancel' },
        { text: '打开', onPress: () => Linking.openURL(url) },
      ]);
      return;
    }

    const apple = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${label}`;
    const gApp = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    let canGoogle = false;
    try {
      canGoogle = await Linking.canOpenURL(gApp);
    } catch {}

    const options = canGoogle
      ? ['Apple Maps', 'Google Maps', '取消']
      : ['Apple Maps', '取消'];
    const cancelIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex },
      (idx) => {
        if (idx === cancelIndex) return;
        if (options[idx] === 'Google Maps') Linking.openURL(gApp);
        else Linking.openURL(apple);
      },
    );
  }, [gym]);

  const distanceText =
    gym.distance_m == null
      ? null
      : gym.distance_m < 1000
        ? `${Math.round(gym.distance_m)} m`
        : `${(gym.distance_m / 1000).toFixed(1)} km`;

  const subtitle = distanceText
    ? `${tr('攀岩馆', 'Climbing Gym')} · ${distanceText}`
    : tr('攀岩馆', 'Climbing Gym');

  // Action row: Floor plan is the primary CTA (solid accent — the gym's
  // overhead map + route list is the core browse step), Community +
  // Directions are tinted secondaries. Favorite + Share live in the
  // sheet's glass footer.
  const actions: PlaceSheetAction[] = [
    {
      icon: 'map-outline',
      label: tr('俯瞰图', 'Floor plan'),
      onPress: handleViewFloorPlan,
      loading: navigating,
      variant: 'solid',
    },
    {
      icon: 'people-outline',
      label: tr('社区', 'Community'),
      onPress: handleViewCommunity,
      variant: 'tint',
    },
    {
      icon: 'navigate',
      label: tr('导航', 'Directions'),
      onPress: handleNavigate,
      variant: 'tint',
    },
  ];

  return (
    <View style={styles.root}>
      {/* GymPlace has no cover_url yet — hero shows the bundled
          generic placeholder until per-gym covers ship. */}
      <PlaceSheetHero
        imageUrl={null}
        fallbackIcon="business-outline"
        placeholderSource={require('../../../../assets/images/placeholders/hero-default.jpg')}
      />
      <PlaceSheetIdentity title={gym.name} subtitle={subtitle} />
      <PlaceSheetActions actions={actions} />

      {/* Feature module — GymStatsCard renders the headline KPIs
          (sends / climbers / weekly active) plus popular grades and
          boulder/rope distribution. */}
      {gymId ? (
        <View style={styles.statsWrap}>
          <GymStatsCard gymId={gymId} />
        </View>
      ) : (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

const createStyles = (_c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    root: {
      paddingBottom: 14,
    },
    statsWrap: {
      marginTop: 4,
    },
    statsLoading: {
      marginTop: 20,
      alignItems: 'center',
    },
  });
