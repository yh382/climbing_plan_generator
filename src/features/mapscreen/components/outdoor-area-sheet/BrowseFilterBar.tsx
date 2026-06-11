// src/features/mapscreen/components/outdoor-area-sheet/BrowseFilterBar.tsx
// CB 点7 — persistent filter capsule for the browse route list. Pinned by the
// parent (AreaRoutesBrowser) ABOVE the FlatList so it does NOT scroll with the
// route cards. Row: [🔍 search] [Sort ▾] … [Boulder | Routes].
//
// - Sort uses MenuPill (native UIMenu) per CLAUDE.md "inline option menus".
// - Segment is 2-way Boulder|Routes (Routes = non-boulder = rope + other, so
//   nothing is hidden). Default selection is owned by the parent.
// - Search is a compact icon that expands an inline TextInput on its own row
//   (replaces the old header magnifier + searchOpen→showControls mechanism).
// - Grade-range picker is intentionally NOT here yet — it lands in 点7b.

import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';

import { MenuPill } from '../../../../components/ui/MenuPill';
import { NativeSegmentedControl } from '../../../../components/ui/NativeSegmentedControl';
import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import { theme } from '../../../../lib/theme';
import type { ThemeColors } from './shared';

export type RouteSortKey = 'classic' | 'ascents' | 'grade';
export type RouteDiscipline = 'boulder' | 'rope';

type Props = {
  sortKey: RouteSortKey;
  onSortKey: (k: RouteSortKey) => void;
  /** 'boulder' | 'rope' — 'rope' means "everything that isn't boulder". */
  discipline: RouteDiscipline;
  onDiscipline: (d: RouteDiscipline) => void;
  search: string;
  onSearch: (s: string) => void;
  /** CB — Routes sub-filter (Sport/Trad), shown only when discipline==='rope'.
   *  Multi-select; both on = no narrowing. */
  subSport?: boolean;
  subTrad?: boolean;
  onToggleSub?: (k: 'sport' | 'trad') => void;
};

export function BrowseFilterBar({
  sortKey, onSortKey, discipline, onDiscipline, search, onSearch,
  subSport, subTrad, onToggleSub,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keep the search box in sync with the keyboard: when the keyboard is
  // dismissed by ANY route (dragging the sheet/list down, return key, tap-
  // away) collapse the box too, instead of leaving an orphaned unfocused
  // input behind. Subscribe only while open.
  useEffect(() => {
    if (!searchOpen) return;
    const sub = Keyboard.addListener('keyboardDidHide', () =>
      setSearchOpen(false),
    );
    return () => sub.remove();
  }, [searchOpen]);

  const sortLabels: Record<RouteSortKey, string> = {
    classic: tr('经典', 'Classic'),
    ascents: tr('完成数', 'Most ascents'),
    grade: tr('难度', 'Grade'),
  };
  const disciplineIdx = discipline === 'boulder' ? 0 : 1;

  return (
    <View style={styles.bar}>
      <View style={styles.row}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setSearchOpen((v) => !v)}
          hitSlop={8}
          accessibilityLabel={tr('搜索', 'Search')}
        >
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
          <Ionicons
            name="search"
            size={17}
            color={searchOpen ? colors.textPrimary : colors.textSecondary}
          />
        </Pressable>

        <MenuPill
          variant="labeled"
          glass
          label={sortLabels[sortKey]}
          accessibilityLabel={tr('排序', 'Sort')}
          options={[
            { label: sortLabels.classic, onPress: () => onSortKey('classic') },
            { label: sortLabels.ascents, onPress: () => onSortKey('ascents') },
            { label: sortLabels.grade, onPress: () => onSortKey('grade') },
          ]}
        />

        <View style={styles.spacer} />

        <NativeSegmentedControl
          options={[tr('抱石', 'Boulder'), tr('路线', 'Routes')]}
          selectedIndex={disciplineIdx}
          onSelect={(i) => onDiscipline(i === 0 ? 'boulder' : 'rope')}
          style={styles.segment}
        />
      </View>

      {discipline === 'rope' && onToggleSub ? (
        <View style={styles.subRow}>
          {(
            [
              ['sport', tr('运动', 'Sport'), !!subSport],
              ['trad', tr('传统', 'Trad'), !!subTrad],
            ] as const
          ).map(([k, label, active]) => (
            <Pressable
              key={k}
              onPress={() => onToggleSub(k)}
              style={[styles.subChip, active && styles.subChipActive]}
            >
              <Text
                style={[styles.subChipText, active && styles.subChipTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {searchOpen ? (
        <View style={styles.searchBox}>
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
          <Ionicons name="search" size={15} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={onSearch}
            placeholder={tr('搜索路线名', 'Search route name')}
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      paddingHorizontal: 14,
      paddingTop: 4,
      paddingBottom: 10,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    },
    spacer: { flex: 1 },
    segment: { minWidth: 150 },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, height: 38, borderRadius: 12,
      overflow: 'hidden',
    },
    searchInput: {
      flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0,
      fontFamily: theme.fonts.regular,
    },
    subRow: { flexDirection: 'row', gap: 8, paddingLeft: 2 },
    subChip: {
      paddingHorizontal: 13, paddingVertical: 5, borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
    },
    subChipActive: { backgroundColor: colors.accent },
    subChipText: {
      fontSize: 12, fontFamily: theme.fonts.medium, color: colors.textSecondary,
    },
    subChipTextActive: { color: '#FFFFFF' },
  });
