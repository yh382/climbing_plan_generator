// src/features/mapscreen/components/outdoor-area-sheet/BrowseFilterBar.tsx
// CB 点7 — persistent filter capsule for the browse route list. Pinned by the
// parent (AreaRoutesBrowser) ABOVE the FlatList so it does NOT scroll with the
// route cards. Row: [🔍 search] [Sort/Type ▾] … [Boulder | Routes].
//
// - Sort + the Routes→Sport/Trad sub-filter live in ONE glass menu
//   (BrowseSortMenu): a Sort section + a Type section (Routes only), with the
//   menu staying open across multi-toggles.
// - Segment is 2-way Boulder|Routes (Routes = non-boulder, so nothing hidden).
// - Search is a compact icon that expands an inline TextInput on its own row.

import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';

import { NativeSegmentedControl } from '../../../../components/ui/NativeSegmentedControl';
import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import { theme } from '../../../../lib/theme';
import type { ThemeColors } from './shared';
import { BrowseSortMenu } from './BrowseSortMenu';

export type RouteSortKey = 'classic' | 'grade';
export type RouteDiscipline = 'boulder' | 'rope';

type Props = {
  sortKey: RouteSortKey;
  onSortKey: (k: RouteSortKey) => void;
  /** 'boulder' | 'rope' — 'rope' means "everything that isn't boulder". */
  discipline: RouteDiscipline;
  onDiscipline: (d: RouteDiscipline) => void;
  search: string;
  onSearch: (s: string) => void;
  /** CB — Routes sub-filter (Sport/Trad), surfaced inside the sort menu when
   *  discipline==='rope'. Multi-select; both on = no narrowing. */
  subSport: boolean;
  subTrad: boolean;
  onToggleSub: (k: 'sport' | 'trad') => void;
};

export function BrowseFilterBar({
  sortKey, onSortKey, discipline, onDiscipline, search, onSearch,
  subSport, subTrad, onToggleSub,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keep the search box in sync with the keyboard — dismissing the keyboard
  // (drag, return key, tap-away) collapses the box too.
  useEffect(() => {
    if (!searchOpen) return;
    const sub = Keyboard.addListener('keyboardDidHide', () => setSearchOpen(false));
    return () => sub.remove();
  }, [searchOpen]);

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

        <BrowseSortMenu
          sortKey={sortKey}
          onSortKey={onSortKey}
          discipline={discipline}
          subSport={subSport}
          subTrad={subTrad}
          onToggleSub={onToggleSub}
        />

        <View style={styles.spacer} />

        <NativeSegmentedControl
          options={[tr('抱石', 'Boulder'), tr('路线', 'Routes')]}
          selectedIndex={disciplineIdx}
          onSelect={(i) => onDiscipline(i === 0 ? 'boulder' : 'rope')}
          style={styles.segment}
        />
      </View>

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
  });
