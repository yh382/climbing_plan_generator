// src/features/mapscreen/components/outdoor-area-sheet/AreaRoutesBrowser.tsx
// CA-FU Phase C.3 — full routes browser for a crag (leaf-with-routes).
//
// Forked from AreaRoutesPreview (which stays the compact info-sheet preview).
// This one is the PRIMARY browse surface: a FlatList (handles Stone Fort's
// 357 routes) + a local name-search box + a discipline NativeSegmentedControl.
//
// Routes arrive PRE-SORTED from the BE in the CA-FU Q4 default order
// (stars DESC NULLS LAST, send_count DESC, grade_score ASC) — we do NOT
// re-sort, only client-filter by name + discipline. (FlashList isn't a
// project dep yet; FlatList with windowing handles the row counts here.)

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { NativeSegmentedControl } from '../../../../components/ui/NativeSegmentedControl';
import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { OutdoorRoute } from '../../../outdoor/types';
import RouteListCard from '../../../outdoor/components/RouteListCard';
import { sheetLabels, type ThemeColors } from './shared';

type Discipline = 'all' | 'boulder' | 'rope' | 'other';
const DISCIPLINE_ORDER: Discipline[] = ['all', 'boulder', 'rope', 'other'];

type Props = {
  routes: OutdoorRoute[] | null;
  loading: boolean;
  onRouteTap: (route: OutdoorRoute) => void;
  /** Optional element pinned above the search row (scrolls with the list). */
  ListHeaderComponent?: React.ReactElement | null;
  /** When false, the search box + discipline filter are hidden (the parent
   *  owns a search toggle button in its header). Default true. */
  showControls?: boolean;
};

export function AreaRoutesBrowser({
  routes, loading, onRouteTap, ListHeaderComponent, showControls = true,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const [disciplineIdx, setDisciplineIdx] = useState(0);

  const disciplineLabels = useMemo(
    () => [tr('全部', 'All'), tr('抱石', 'Boulder'), tr('绳索', 'Rope'), tr('其他', 'Other')],
    [tr],
  );

  const filtered = useMemo(() => {
    if (!routes) return [];
    const discipline = DISCIPLINE_ORDER[disciplineIdx];
    const needle = search.trim().toLowerCase();
    return routes.filter((r) => {
      if (discipline !== 'all' && r.discipline !== discipline) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [routes, disciplineIdx, search]);

  const header = (
    <View>
      {ListHeaderComponent}
      {showControls ? (
        <View style={styles.controls}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={tr('在该岩点内搜索路线', 'Search routes in this crag')}
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <NativeSegmentedControl
            options={disciplineLabels}
            selectedIndex={disciplineIdx}
            onSelect={setDisciplineIdx}
          />
        </View>
      ) : null}
    </View>
  );

  if (loading && !routes) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={20}
      windowSize={11}
      removeClippedSubviews
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {search.trim() || disciplineIdx !== 0
            ? tr('无匹配路线', 'No matching routes')
            : sheetLabels.emptyRoutes(tr)}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.cardWrap}>
          <RouteListCard
            route={item}
            onPress={() => onRouteTap(item)}
            hideLocation
          />
        </View>
      )}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  center: { paddingHorizontal: 18, paddingTop: 8, gap: 12 },
  controls: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  listContent: { paddingBottom: 24 },
  cardWrap: { paddingHorizontal: 14, paddingVertical: 3 },
  empty: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
});
