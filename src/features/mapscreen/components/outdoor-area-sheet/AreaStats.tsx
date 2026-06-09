// src/features/mapscreen/components/outdoor-area-sheet/AreaStats.tsx
// CA Phase 4a — Counts pills (direct vs subtree).

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import { routeCountLabel, childCountLabel, type ThemeColors } from './shared';

type Props = {
  directRouteCount: number;
  subtreeRouteCount: number;
  directChildCount: number;
};

export function AreaStats({
  directRouteCount, subtreeRouteCount, directChildCount,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Show direct route count when there are direct routes; otherwise show
  // subtree count as the meaningful number for intermediate areas.
  const primaryRouteCount = directRouteCount > 0 ? directRouteCount : subtreeRouteCount;
  // Show subtree as additional context when distinct from direct.
  const showSubtreeContext = subtreeRouteCount > directRouteCount;

  return (
    <View style={styles.row}>
      {primaryRouteCount > 0 ? (
        <View style={[styles.pill, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="trail-sign-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.pillText, { color: colors.textPrimary }]}>
            {routeCountLabel(primaryRouteCount, tr)}
          </Text>
          {showSubtreeContext && directRouteCount > 0 ? (
            <Text style={[styles.pillSubtext, { color: colors.textSecondary }]}>
              {tr('（含 ', '(incl. ')}{subtreeRouteCount}{tr(' 全部）', ' total)')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {directChildCount > 0 ? (
        <View style={[styles.pill, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="layers-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.pillText, { color: colors.textPrimary }]}>
            {childCountLabel(directChildCount, tr)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (_colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
});
