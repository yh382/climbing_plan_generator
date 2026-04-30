import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../../../lib/useThemeColors';

export type PlaceSheetStat = {
  value: string | number;
  label: string;
};

type Props = {
  stats: PlaceSheetStat[];
};

/**
 * Apple Maps-style info strip — no card backgrounds (the data is
 * informational, not a button), plain columns with the small label
 * on top and the larger value below, left-aligned. Sits naturally on
 * the sheet's liquid glass surface.
 */
export function PlaceSheetStats({ stats }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={`${s.label}-${i}`} style={styles.cell}>
          <Text style={styles.label} numberOfLines={1}>
            {s.label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {s.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingHorizontal: 22,
      gap: 16,
      marginBottom: 20,
    },
    cell: {
      flex: 1,
      alignItems: 'flex-start',
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: c.textSecondary,
      marginBottom: 2,
    },
    value: {
      fontSize: 20,
      fontWeight: '700',
      color: c.textPrimary,
    },
  });
