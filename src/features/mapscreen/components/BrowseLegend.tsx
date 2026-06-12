// src/features/mapscreen/components/BrowseLegend.tsx
// CB Phase F — compact 4-color legend for the browse sheet, so the pin /
// ring / donut colors are self-explanatory. Single row of [dot · label] for
// boulder / sport / trad / other, using the shared STYLE_COLORS.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { STYLE_COLORS } from '../../outdoor/components/RoutePinCluster';
import type { ThemeColors } from './outdoor-area-sheet/shared';

export function BrowseLegend() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const items: [string, string][] = [
    [STYLE_COLORS.boulder, tr('抱石', 'Boulder')],
    [STYLE_COLORS.sport, tr('运动', 'Sport')],
    [STYLE_COLORS.trad, tr('传统', 'Trad')],
    [STYLE_COLORS.other, tr('其它', 'Other')],
  ];

  return (
    <View style={styles.row}>
      {items.map(([color, label]) => (
        <View key={label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 14,
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 9, height: 9, borderRadius: 4.5 },
    label: {
      fontFamily: theme.fonts.medium,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });
