// src/features/mapscreen/components/outdoor-area-sheet/AreaChildrenList.tsx
// CA Phase 4a — children-first list (plan v8 §Children-first UX).
// Children come from `useAreaChildren` hook, sorted by subtree_route_count desc.

import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { OutdoorAreaListItem } from '../../../outdoor/types';
import {
  displayKindLabel,
  routeCountLabel,
  sheetLabels,
  type ThemeColors,
} from './shared';

type Props = {
  children: OutdoorAreaListItem[] | null;
  loading: boolean;
  /** Called when user taps a child row. */
  onChildTap: (child: OutdoorAreaListItem) => void;
  /** Max rows to render inline (caller handles "show all" if needed). */
  maxRows?: number;
};

export function AreaChildrenList({
  children, loading, onChildTap, maxRows = 8,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading && !children) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  if (!children || children.length === 0) {
    return null;
  }

  const visible = children.slice(0, maxRows);
  const hidden = children.length - visible.length;

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>
        {sheetLabels.children(tr)}
      </Text>
      {visible.map((child) => (
        <Pressable
          key={child.id}
          onPress={() => onChildTap(child)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? colors.backgroundSecondary : 'transparent' },
          ]}
        >
          <View style={styles.rowMain}>
            <Text
              style={[styles.rowTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {child.name}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
              {displayKindLabel(child.display_kind, tr)} · {routeCountLabel(child.subtree_route_count, tr)}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textTertiary}
          />
        </Pressable>
      ))}
      {hidden > 0 ? (
        <Text style={[styles.moreLabel, { color: colors.textSecondary }]}>
          {tr(`还有 ${hidden} 个`, `+${hidden} more`)}
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 10,
    gap: 8,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreLabel: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
