// src/features/mapscreen/components/outdoor-area-sheet/AreaRoutesPreview.tsx
// CA Phase 4a — Routes preview for leaf areas.
// Mirrors existing CragInfoSheet route row pattern (sorted by grade).

import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { OutdoorRoute } from '../../../outdoor/types';
import { sheetLabels, type ThemeColors } from './shared';

type Props = {
  routes: OutdoorRoute[] | null;
  loading: boolean;
  onRouteTap?: (route: OutdoorRoute) => void;
  maxRows?: number;
};

export function AreaRoutesPreview({
  routes, loading, onRouteTap, maxRows = 12,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading && !routes) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {sheetLabels.routes(tr)}
        </Text>
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {sheetLabels.emptyRoutes(tr)}
        </Text>
      </View>
    );
  }

  const visible = routes.slice(0, maxRows);
  const hidden = routes.length - visible.length;

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>
        {sheetLabels.routes(tr)}
      </Text>
      {visible.map((route) => (
        <Pressable
          key={route.id}
          onPress={() => onRouteTap?.(route)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.backgroundSecondary : 'transparent' },
          ]}
        >
          <Text
            style={[styles.routeGrade, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {route.grade_text}
          </Text>
          <Text
            style={[styles.routeName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {route.name}
          </Text>
          {onRouteTap ? (
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.textTertiary}
            />
          ) : null}
        </Pressable>
      ))}
      {hidden > 0 ? (
        <Text style={[styles.moreLabel, { color: colors.textSecondary }]}>
          {tr(`还有 ${hidden} 条路线`, `+${hidden} more routes`)}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 18,
    gap: 4,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 8,
    gap: 12,
  },
  routeGrade: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 48,
    fontVariant: ['tabular-nums'],
  },
  routeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  empty: {
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 6,
  },
  moreLabel: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
