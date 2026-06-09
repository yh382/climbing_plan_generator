// src/features/mapscreen/components/outdoor-area-sheet/AreaHero.tsx
//
// CA Phase 4a — Hero header for OutdoorAreaInfoSheet.
// Renders area cover image + name + display_kind badge.
// Plan v8 §Phase 4: every subcomponent uses useThemeColors() + tr(zh,en).

import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import { PlaceSheetHero } from '../../../../components/shared/placeSheet';
import type { DisplayKind } from '../../../outdoor/types';
import { displayKindLabel, type ThemeColors } from './shared';

type Props = {
  name: string;
  nameEn?: string | null;
  displayKind: DisplayKind;
  coverUrl?: string | null;
  /** Sub-title — typically parent area name for navigation context. */
  parentName?: string | null;
};

export function AreaHero({
  name, nameEn, displayKind, coverUrl, parentName,
}: Props) {
  const colors = useThemeColors();
  const { tr, isZH } = useSettings();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const kindLabel = displayKindLabel(displayKind, tr);
  const titleText = isZH && nameEn ? name : (name || nameEn || '');

  return (
    <View style={{ position: 'relative' }}>
      <PlaceSheetHero
        imageUrl={coverUrl ?? null}
        fallbackIcon="triangle-outline"
      />
      <View style={styles.titleOverlay}>
        <View style={[styles.kindBadge, { backgroundColor: colors.pillBackground }]}>
          <Ionicons
            name={iconForKind(displayKind)}
            size={12}
            color={colors.pillText}
          />
          <Text style={[styles.kindBadgeText, { color: colors.pillText }]}>
            {kindLabel}
          </Text>
        </View>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {titleText}
        </Text>
        {parentName ? (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {parentName}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function iconForKind(k: DisplayKind): keyof typeof Ionicons.glyphMap {
  switch (k) {
    case 'country': return 'flag-outline';
    case 'state':   return 'map-outline';
    case 'region':  return 'navigate-outline';
    case 'area':    return 'compass-outline';
    case 'crag':    return 'triangle-outline';
    case 'wall':    return 'layers-outline';
  }
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  titleOverlay: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 6,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kindBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});
