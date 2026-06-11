// src/features/mapscreen/components/outdoor-area-sheet/AreaRoutesBrowser.tsx
// CA-FU Phase C.3 — full routes browser. CB 点3/点7/点8:
//  - pinned filter capsule (BrowseFilterBar) above a snap-to-card FlatList
//  - 点3 nearby browse shows the crag·area subtitle (showLocation)
//  - 点3b: tapping a crag pin pins THAT crag's routes to a top section
//    ("📍 crag" + ✕ to clear), above a "Nearby" section with the rest.
//  - #3: each card carries a locate button (onLocateRoute).
// Snap uses snapToOffsets (computed per row) so it stays correct across the
// non-uniform section headers.

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../../lib/useThemeColors';
import { useSettings } from '../../../../contexts/SettingsContext';
import { theme } from '../../../../lib/theme';
import type { OutdoorRoute } from '../../../outdoor/types';
import { isSportRoute, isTradRoute } from '../../../outdoor/discipline';
import RouteListCard from '../../../outdoor/components/RouteListCard';
import { sheetLabels, type ThemeColors } from './shared';
import {
  BrowseFilterBar,
  type RouteDiscipline,
  type RouteSortKey,
} from './BrowseFilterBar';

const ROW_HEIGHT_COMPACT = 80; // 2-line card (single-crag, hideLocation)
const ROW_HEIGHT_FULL = 92; // 3-line card (nearby, crag·area subtitle shown)
const HEADER_H = 40; // section header row (点3b)

type ListItem =
  | { kind: 'header'; key: string; label: string; pinned: boolean }
  | { kind: 'route'; key: string; route: OutdoorRoute };

type Props = {
  routes: OutdoorRoute[] | null;
  loading: boolean;
  onRouteTap: (route: OutdoorRoute) => void;
  /** CB 点3 — show the crag·area subtitle on each card. */
  showLocation?: boolean;
  /** CB 点3b — pin this crag's routes to a top section. */
  focusedCragId?: string | null;
  onClearFocus?: () => void;
  /** CB #3 — locate button on each card. */
  onLocateRoute?: (route: OutdoorRoute) => void;
};

export function AreaRoutesBrowser({
  routes,
  loading,
  onRouteTap,
  showLocation,
  focusedCragId,
  onClearFocus,
  onLocateRoute,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rowHeight = showLocation ? ROW_HEIGHT_FULL : ROW_HEIGHT_COMPACT;

  const [sortKey, setSortKey] = useState<RouteSortKey>('classic');
  const [search, setSearch] = useState('');
  // CB — Routes sub-filter (Sport/Trad). Both on = no narrowing; multi-select.
  const [subSport, setSubSport] = useState(true);
  const [subTrad, setSubTrad] = useState(true);
  // 2-way segment defaults to the area's majority discipline (no empty default).
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
    // sub-filter narrows only when exactly one of Sport/Trad is active.
    const narrowSub = discipline === 'rope' && subSport !== subTrad;
    const list = routes.filter((r) => {
      const isBoulder = r.discipline === 'boulder';
      if (discipline === 'boulder') {
        if (!isBoulder) return false;
      } else {
        if (isBoulder) return false; // Routes = non-boulder
        if (narrowSub) {
          if (subSport && !isSportRoute(r)) return false;
          if (subTrad && !isTradRoute(r)) return false;
        }
      }
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sortKey === 'grade') {
      const big = Number.MAX_SAFE_INTEGER;
      return [...list].sort(
        (a, b) => (a.grade_score ?? big) - (b.grade_score ?? big),
      );
    }
    return list; // 'classic' — keep the BE marquee order
  }, [routes, discipline, search, sortKey, subSport, subTrad]);

  // 点3b — split into pinned (focused crag) + nearby sections, then flatten to
  // a typed item list with per-row layout offsets (so snapToOffsets stays
  // correct across the shorter section headers).
  const { listItems, layouts, snapOffsets } = useMemo(() => {
    const pinned = focusedCragId
      ? visible.filter((r) => r.area_id === focusedCragId)
      : [];
    const items: ListItem[] = [];
    if (pinned.length > 0) {
      const cragName = pinned[0].crag_name ?? tr('已选岩点', 'Selected crag');
      items.push({ kind: 'header', key: '__pinned', label: cragName, pinned: true });
      for (const r of pinned) items.push({ kind: 'route', key: r.id, route: r });
      items.push({
        kind: 'header',
        key: '__nearby',
        label: tr('附近', 'Nearby'),
        pinned: false,
      });
      for (const r of visible) {
        if (r.area_id !== focusedCragId) items.push({ kind: 'route', key: r.id, route: r });
      }
    } else {
      for (const r of visible) items.push({ kind: 'route', key: r.id, route: r });
    }

    const lays: { length: number; offset: number }[] = [];
    const snaps: number[] = [];
    let off = 0;
    for (const it of items) {
      const len = it.kind === 'header' ? HEADER_H : rowHeight;
      lays.push({ length: len, offset: off });
      if (it.kind === 'route') snaps.push(off);
      off += len;
    }
    return { listItems: items, layouts: lays, snapOffsets: snaps };
  }, [visible, focusedCragId, rowHeight, tr]);

  const bar = (
    <BrowseFilterBar
      sortKey={sortKey}
      onSortKey={setSortKey}
      discipline={discipline}
      onDiscipline={setDisciplineOverride}
      search={search}
      onSearch={setSearch}
      subSport={subSport}
      subTrad={subTrad}
      onToggleSub={(k) =>
        k === 'sport' ? setSubSport((v) => !v) : setSubTrad((v) => !v)
      }
    />
  );

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
        data={listItems}
        keyExtractor={(it) => it.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        windowSize={11}
        removeClippedSubviews
        snapToOffsets={snapOffsets}
        snapToAlignment="start"
        decelerationRate="fast"
        getItemLayout={(_, index) => {
          // Guard the transient window where the virtualizer asks for an index
          // from a previous (longer) data set before re-render.
          const l = layouts[index] ?? { length: rowHeight, offset: 0 };
          return { length: l.length, offset: l.offset, index };
        }}
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
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText} numberOfLines={1}>
                {item.pinned ? `📍 ${item.label}` : item.label}
              </Text>
              {item.pinned && onClearFocus ? (
                <Pressable onPress={onClearFocus} hitSlop={10}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={[styles.cardWrap, { height: rowHeight }]}>
              <RouteListCard
                route={item.route}
                onPress={() => onRouteTap(item.route)}
                hideLocation={!showLocation}
                glass
                onLocate={
                  onLocateRoute ? () => onLocateRoute(item.route) : undefined
                }
              />
            </View>
          )
        }
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
    listContent: { paddingBottom: 24 },
    cardWrap: { paddingHorizontal: 14, justifyContent: 'center' },
    sectionHeader: {
      height: HEADER_H,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
    },
    sectionHeaderText: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    empty: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
  });
