// src/features/outdoor/components/AreaDetailCard.tsx
// Summary card for Area pin tap on Locations map → navigates to crag-map

import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
// BR Track A: this card renders the top-level Region (was Area). Type
// alias kept for caller minimum-diff — Track D will rename.
import type { Region as Area } from '../types';
import { mapHref } from '../../mapscreen/navigation';
import useMapSavedSpotHighlightStore from '../../../store/useMapSavedSpotHighlightStore';

interface AreaDetailCardProps {
  area: Area;
  onClose: () => void;
  /** Override "View Route Map" behavior. When set, the default
   *  `router.push('/outdoor/crag-map')` is skipped — lets the unified
   *  MapScreen swap mode in-place instead of full-page navigation. */
  onViewRoutes?: () => void;
}

export function AreaDetailCard({ area, onClose, onViewRoutes }: AreaDetailCardProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleViewCragMap = () => {
    onClose();
    if (onViewRoutes) {
      onViewRoutes();
      return;
    }
    // Mirror SavedSpotsCarousel: highlight + go to gyms map. CN gyms
    // sheet's GymsSavedSpotsRow surfaces the highlighted area at index
    // 0; user taps it to drill into area mode. Single entry path keeps
    // the state machine simple and consistent with overseas Mapbox.
    useMapSavedSpotHighlightStore.getState().setHighlight(area.id);
    router.push(mapHref());
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>{area.name}</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>{tr('攀岩区', 'Climbing Area')}</Text>
          {area.region && (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.region}>{area.region}</Text>
            </>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="trail-sign-outline" size={18} color={colors.accent} />
          <Text style={styles.statValue}>{area.route_count ?? 0}</Text>
          <Text style={styles.statLabel}>{tr('路线', 'Routes')}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="layers-outline" size={18} color={colors.accent} />
          <Text style={styles.statValue}>{area.area_count ?? 0}</Text>
          <Text style={styles.statLabel}>{tr('攀岩区', 'Areas')}</Text>
        </View>
        {area.best_seasons && area.best_seasons.length > 0 && (
          <View style={styles.stat}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <Text style={styles.statValue}>{area.best_seasons.slice(0, 3).join(', ')}</Text>
            <Text style={styles.statLabel}>{tr('最佳季节', 'Season')}</Text>
          </View>
        )}
      </View>

      {/* Enter crag map */}
      <TouchableOpacity style={styles.enterBtn} onPress={handleViewCragMap} activeOpacity={0.7}>
        <Ionicons name="map-outline" size={16} color={colors.accent} />
        <Text style={styles.enterBtnText}>{tr('查看路线地图', 'View Route Map')}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14 },
    header: { paddingRight: 48, marginBottom: 16 },
    name: { fontFamily: theme.fonts.bold, fontSize: 22, color: c.textPrimary, letterSpacing: -0.3, lineHeight: 26 },
    subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    subtitle: { fontFamily: theme.fonts.medium, fontSize: 13, color: c.textSecondary },
    dot: { fontSize: 13, color: c.textSecondary },
    region: { fontFamily: theme.fonts.medium, fontSize: 13, color: c.accent },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    stat: { flex: 1, backgroundColor: c.cardBackground, borderRadius: theme.borderRadius.cardSmall, paddingVertical: 10, alignItems: 'center', gap: 4 },
    statValue: { fontFamily: theme.fonts.bold, fontSize: 14, color: c.textPrimary },
    statLabel: { fontFamily: theme.fonts.regular, fontSize: 11, color: c.textSecondary },
    enterBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: theme.borderRadius.cardSmall, backgroundColor: c.cardBackground },
    enterBtnText: { fontFamily: theme.fonts.bold, fontSize: 14, color: c.accent },
  });
