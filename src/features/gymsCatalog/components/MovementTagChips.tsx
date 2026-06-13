// Movement-characteristic tag chips (Window INDOOR_SET / SET-P3). Renders
// the routesetter's movement_tags as a wrapped chip cloud. The 4 backend
// categories (grip / footwork / style / usage) are flattened in a stable
// order — climbers read the combined cloud; the per-category split only
// matters to the setter picker (admin-cms). Returns null when there are no
// tags so callers can mount it unconditionally.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import type { MovementTags } from '../types';

type Props = { tags?: MovementTags | null };

// Stable render order so the same route always lays its chips out the same
// way (no flicker between fetches).
const CATEGORY_ORDER: Array<keyof MovementTags> = [
  'grip',
  'footwork',
  'style',
  'usage',
];

export function MovementTagChips({ tags }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const flat = useMemo(() => {
    if (!tags) return [];
    const out: Array<{ key: string; value: string }> = [];
    for (const cat of CATEGORY_ORDER) {
      for (const value of tags[cat] ?? []) {
        if (value) out.push({ key: `${cat}-${value}`, value });
      }
    }
    return out;
  }, [tags]);

  if (flat.length === 0) return null;

  return (
    <View style={styles.row}>
      {flat.map(({ key, value }) => (
        <View key={key} style={styles.chip}>
          <Text style={styles.chipText}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: c.backgroundSecondary,
    },
    chipText: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
  });
