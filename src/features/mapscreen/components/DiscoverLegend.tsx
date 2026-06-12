// src/features/mapscreen/components/DiscoverLegend.tsx
// CB Phase F — compact legend for the discover sheet, explaining the map
// markers: brown = Boulder, teal-blue = Routes (the crag ring colors), teardrop
// = Rock gym.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { ThemeColors } from './outdoor-area-sheet/shared';

export function DiscoverLegend() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <View style={[styles.dot, { backgroundColor: theme.colors.outdoorMarkerFill }]} />
        <Text style={styles.label}>{tr('抱石', 'Boulder')}</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.dot, { backgroundColor: theme.colors.routesMarkerFill }]} />
        <Text style={styles.label}>{tr('路线', 'Routes')}</Text>
      </View>
      <View style={styles.item}>
        <Svg width={11} height={14} viewBox="0 0 32 40">
          <Path
            d="M16 1.5 C 8 1.5 1.5 8 1.5 16 C 1.5 26 16 38.5 16 38.5 C 16 38.5 30.5 26 30.5 16 C 30.5 8 24 1.5 16 1.5 Z"
            fill={theme.colors.gymMarkerFill}
          />
          <Circle cx={16} cy={15.5} r={5.5} fill="#FFFFFF" />
        </Svg>
        <Text style={styles.label}>{tr('岩馆', 'Rock gym')}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 16,
      paddingHorizontal: 22,
      paddingVertical: 6,
    },
    item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 9, height: 9, borderRadius: 4.5 },
    label: {
      fontFamily: theme.fonts.medium,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });
