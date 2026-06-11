// src/features/mapscreen/components/outdoor-area-sheet/AreaRoutesBrowser.tsx
// CA-FU Phase C.3 — full routes browser for a crag (leaf-with-routes).
//
// CB 点7/点8 — the filter capsule (BrowseFilterBar) is now PINNED above the
// FlatList (does not scroll), the discipline filter is a 2-way Boulder|Routes
// segment, and sort (Classic / Most ascents / Grade) is applied client-side.
// Routes still arrive PRE-SORTED from the BE in the CA-FU Q4 marquee order
// ('classic' keeps that order); only 'ascents'/'grade' re-sort locally. The
// list snaps to each card (点8). Single-crag flow keeps the card subtitle
// hidden (hideLocation) — it surfaces once the nearby-radius flow (点3) lands.

import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { OutdoorRoute } from '../../../outdoor/types';
import RouteListCard from '../../../outdoor/components/RouteListCard';
import { sheetLabels, type ThemeColors } from './shared';
import {
  BrowseFilterBar,
  type RouteDiscipline,
  type RouteSortKey,
} from './BrowseFilterBar';

// 点8 — fixed row height so snapToInterval + getItemLayout are exact. Tuned
// for the current 2-line card (hideLocation on): thumbnail 72 + the card's own
// ~8px marginBottom = the visible row gap. 80 is the tight floor — going lower
// clips the 72px thumbnail. When 点3 turns on the crag·area subtitle (3rd
// line) this must grow back to ~92 or the card clips.
const ROW_HEIGHT = 80;

type Props = {
  routes: OutdoorRoute[] | null;
  loading: boolean;
  onRouteTap: (route: OutdoorRoute) => void;
};

export function AreaRoutesBrowser({ routes, loading, onRouteTap }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sortKey, setSortKey] = useState<RouteSortKey>('classic');
  const [search, setSearch] = useState('');
  // 2-way segment has no "all"; default to the discipline that dominates this
  // area so a boulder-only crag doesn't open to an empty "Routes" tab. User
  // override (if any) wins.
  const [disciplineOverride, setDisciplineOverride] =
    useState<RouteDiscipline | null>(null);
  const autoDiscipline = useMemo<RouteDiscipline>(() => {
    if (!routes || routes.length === 0) return 'rope';
    const boulders = routes.reduce(
      (n, r) => n + (r.discipline === 'boulder' ? 1 : 0),
      0,
    );
    return boulders > routes.length - boulders ? 'boulder' : 'rope';
  }, [routes]);
  const discipline = disciplineOverride ?? autoDiscipline;

  const visible = useMemo(() => {
    if (!routes) return [];
    const needle = search.trim().toLowerCase();
    const list = routes.filter((r) => {
      const isBoulder = r.discipline === 'boulder';
      if (discipline === 'boulder' && !isBoulder) return false;
      if (discipline === 'rope' && isBoulder) return false; // Routes = non-boulder
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sortKey === 'ascents') {
      return [...list].sort((a, b) => (b.send_count ?? 0) - (a.send_count ?? 0));
    }
    if (sortKey === 'grade') {
      const big = Number.MAX_SAFE_INTEGER;
      return [...list].sort(
        (a, b) => (a.grade_score ?? big) - (b.grade_score ?? big),
      );
    }
    return list; // 'classic' — keep the BE marquee order untouched
  }, [routes, discipline, search, sortKey]);

  const bar = (
    <BrowseFilterBar
      sortKey={sortKey}
      onSortKey={setSortKey}
      discipline={discipline}
      onDiscipline={setDisciplineOverride}
      search={search}
      onSearch={setSearch}
    />
  );

  // Returned as a Fragment (not wrapped in another View) so the FlatList stays
  // within TrueSheet's 2-level findScrollView reach: parent OutdoorBrowseSheet
  // renders <View fill>{header}{this}</View>, so bar + FlatList become direct
  // children of that one wrapper (FlatList at native L2). Wrapping here would
  // push it to L3 and break sheet-drag↔list-scroll coordination.
  if (loading && !routes) {
    return (
      <>
        {bar}
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      </>
    );
  }

  return (
    <>
      {bar}
      <FlatList
        style={styles.fill}
        data={visible}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        windowSize={11}
        removeClippedSubviews
        // 点8 — snap each card to the top of the list, picker-style.
        snapToInterval={ROW_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search.trim()
              ? tr('无匹配路线', 'No matching routes')
              : routes && routes.length > 0
                ? tr('该筛选下暂无路线', 'No routes in this filter')
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
    </>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    fill: { flex: 1 },
    center: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
    },
    listContent: { paddingTop: 6, paddingBottom: 24 },
    cardWrap: { height: ROW_HEIGHT, paddingHorizontal: 14, justifyContent: 'center' },
    empty: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
  });
