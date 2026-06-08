/**
 * RoutesListSheet — extracted from MapScreenMapbox `pinnedHeaderOverlay`
 * block in BR Track D Day 2 (PLAN_BR_TRACK_D §2 item 6 + PLAN §3.2).
 *
 * Renders the routes-of-an-area + saved-list sheet body and its pinned
 * header. Pure presentational component — MapScreenMapbox / crag-map
 * still own the data + mode wiring; this file just hosts the JSX.
 *
 * Header layout (PLAN §3.2):
 *   - row 1 (44pt): [🔍][👥] {title} [☰]
 *   - row 2 (24pt): {subtitle} — large bold wall name when focused
 *
 * Day 2 ships the layout with `wallName` defaulted unset (= single-row
 * "Crag" name, matches the pre-extraction behavior). Day 5 wires the
 * wall-pin-tap that fills `wallName` to flip into 2-row mode.
 *
 * Filter chips: Day 2 leaves the slot empty (`filterChipsSlot` prop
 * unset). Day 6 fills it via the new `FilterChipsBar` component.
 */
import React, { type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import { HeaderButton } from '../../../components/ui/HeaderButton';
import {
  GlassUnionPill,
  type GlassUnionPillItem,
} from '../../../../modules/glass-effect-union/src';
import { getMapSheetBottomInset } from '../../../lib/sheetInsets';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import type { OutdoorListDetail, OutdoorRoute, Wall } from '../../outdoor/types';
import RouteListCard from '../../outdoor/components/RouteListCard';
import WallGroup from '../../outdoor/components/WallGroup';

/** BS-FU-A — crag-browse sub-state summary. When set (and no focusedWall),
 *  RoutesListSheet renders a mini snapshot card + the crag's walls list
 *  (sorted by route_count desc by the caller) instead of the legacy
 *  region-wide walls fan-out. ⓘ tap routes to CragInfoSheet via the
 *  existing onPressTitle callback. */
export type BrowsingCragSummary = {
  id: string;
  name: string;
  /** Parent region/area display name surfaced as subtitle. */
  region_name?: string | null;
  cover_url?: string | null;
  wall_count?: number;
  /** Total routes (rope + boulder). */
  route_count?: number;
  boulder_count?: number;
};

/** Per-frame opaque tr() — pass the bound `tr` from useSettings(). */
type TR = (zh: string, en: string) => string;

export type RoutesListSheetMode =
  /** Routes-of-a-Crag — walls list + optional wall-pin focus. */
  | { kind: 'area'; areaName?: string; sheetTitle?: string | null }
  /** Saved-list contents — list items rendered as RouteListCard. */
  | { kind: 'list'; listDetail: OutdoorListDetail | null };

export type RoutesListSheetProps = {
  mode: RoutesListSheetMode;
  /** Forwarded to inner ScrollView for programmatic scroll-to-item. */
  scrollRef: React.RefObject<ScrollView | null>;
  /** Per-list-item y offsets, used by MapScreenMapbox to scroll to a
   *  highlighted item. Component mutates this map via onLayout. */
  itemOffsets: React.MutableRefObject<Record<string, number>>;
  insets: EdgeInsets;
  tr: TR;

  // --- area mode body ---
  /** Loading flag — covers either the outer presenter sheet load OR
   *  the inner area-data fetch. */
  loading: boolean;
  /** When set, body shows a flat list of matching routes (search mode). */
  searchResults?: OutdoorRoute[] | null;
  /** Hydrated walls list (each with .routes[]) when not in search mode. */
  walls: Wall[];
  /** Wall-pin-tap focus highlight — passed through to WallGroup. */
  highlightedRouteId?: string | null;

  // --- list mode body ---
  /** For list mode — currently focused item id, used to render a
   *  background highlight on the row. */
  focusedItemId?: string | null;

  // --- header (area mode only — list mode reuses the inline title row) ---
  /** When non-empty, switches header to 2-row mode (PLAN §3.2):
   *  title row shows this Wall name, subtitle row shows the Crag name. */
  wallName?: string;
  /** True when MapSearchBar is full-screen expanded — hides the
   *  pinned header so the search input has the full sheet width. */
  searchExpanded: boolean;
  onPressSearch: () => void;
  onPressCommunity: () => void;
  onPressHamburger: () => void;
  onPressTitle: () => void;
  /** Day 6 — FilterChipsBar slot. Day 2 ships with this unset. */
  filterChipsSlot?: ReactNode;

  // --- BS-FU-A crag-browse sub-state ---
  /** When set (and `wallName` unset), body renders a Crag mini-snapshot
   *  + walls list (sorted by caller) instead of the region-wide fan-out. */
  browsingCrag?: BrowsingCragSummary | null;
  /** Pre-sorted walls list (by route_count desc) for the browsing-crag
   *  render branch. Caller owns sort logic. */
  browsingCragWalls?: Wall[] | null;
  /** Wall row tap inside crag-browse → caller transitions to focusedWall. */
  onPressBrowseWall?: (wall: Wall) => void;

  // --- callbacks shared between modes ---
  onPressRoute: (routeId: string) => void;
};

const RoutesListSheet: React.FC<RoutesListSheetProps> = (props) => {
  const colors = useThemeColors();
  const s = createStyles(colors);
  const {
    mode, scrollRef, itemOffsets, insets, tr,
    loading, searchResults, walls, highlightedRouteId,
    focusedItemId,
    wallName, searchExpanded,
    onPressSearch, onPressCommunity, onPressHamburger, onPressTitle,
    filterChipsSlot, onPressRoute,
    browsingCrag, browsingCragWalls, onPressBrowseWall,
  } = props;
  const showBrowsingCrag =
    mode.kind === 'area' && !!browsingCrag && !wallName && !searchResults;
  const ropeCount = browsingCrag
    ? Math.max(0, (browsingCrag.route_count ?? 0) - (browsingCrag.boulder_count ?? 0))
    : 0;

  const showPinnedHeader = mode.kind === 'area' && !searchExpanded;
  const titleText = (() => {
    if (mode.kind !== 'area') return null;
    return mode.areaName ?? tr('攀岩区', 'Area');
  })();

  return (
    <>
      <TopFadeMaskView topFadeRatio={0.15}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            s.sheetBody,
            {
              paddingTop: showPinnedHeader ? (wallName ? 96 : 76) : 4,
              paddingBottom: getMapSheetBottomInset(insets) + 20,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Scoped sub-title row — only shown in list mode (item count)
              or area mode with a custom sheetTitle (search results,
              focused-wall sub-rows). The pinned header overlay carries
              the crag/wall name. */}
          {mode.kind === 'area' && mode.sheetTitle ? (
            <View style={s.titleRow}>
              <Text style={s.sheetTitleText} numberOfLines={1}>
                {mode.sheetTitle}
              </Text>
            </View>
          ) : mode.kind === 'list' && mode.listDetail ? (
            <View style={s.titleRow}>
              <Text style={s.sheetTitleText} numberOfLines={1}>
                {`${mode.listDetail.item_count} ${tr('条路线', mode.listDetail.item_count === 1 ? 'route' : 'routes')}`}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
          ) : mode.kind === 'list' ? (
            mode.listDetail && mode.listDetail.items.length > 0 ? (
              mode.listDetail.items.map((it) => {
                if (!it.route) return null;
                const routeId = it.route.id;
                const highlighted = focusedItemId === it.id;
                return (
                  <View
                    key={it.id}
                    onLayout={(e) => {
                      itemOffsets.current[it.id] = e.nativeEvent.layout.y;
                    }}
                    style={
                      highlighted
                        ? { borderRadius: 14, backgroundColor: colors.backgroundSecondary }
                        : undefined
                    }
                  >
                    <RouteListCard
                      route={{ ...it.route, crag_name: it.crag_name, wall_name: it.wall_name }}
                      onPress={() => onPressRoute(routeId)}
                    />
                  </View>
                );
              })
            ) : (
              <Text style={s.emptyText}>
                {tr('清单暂无路线', 'No routes in this list yet')}
              </Text>
            )
          ) : searchResults ? (
            searchResults.length === 0 ? (
              <Text style={s.emptyText}>{tr('无匹配路线', 'No matching routes')}</Text>
            ) : (
              searchResults.map((route) => (
                <RouteListCard
                  key={route.id}
                  route={route}
                  onPress={() => onPressRoute(route.id)}
                />
              ))
            )
          ) : showBrowsingCrag && browsingCrag ? (
            <>
              {/* BS-FU-A — Crag mini snapshot (tap → CragInfoSheet via
                  onPressTitle, same callback wired to pinned header). */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPressTitle}
                style={s.browseSnapshot}
              >
                <View style={s.browseSnapshotTextBlock}>
                  <Text style={s.browseSnapshotName} numberOfLines={2}>
                    {browsingCrag.name}
                  </Text>
                  {browsingCrag.region_name ? (
                    <Text style={s.browseSnapshotSubtitle} numberOfLines={1}>
                      {browsingCrag.region_name}
                    </Text>
                  ) : null}
                  <Text style={s.browseSnapshotMeta} numberOfLines={1}>
                    {browsingCrag.wall_count ?? 0}{' '}
                    {tr(
                      '岩壁',
                      (browsingCrag.wall_count ?? 0) === 1 ? 'wall' : 'walls',
                    )}
                    {'  ·  '}
                    {ropeCount}{' '}
                    {tr('绳攀线路', ropeCount === 1 ? 'route' : 'routes')}
                    {'  ·  '}
                    {browsingCrag.boulder_count ?? 0}{' '}
                    {tr(
                      '抱石',
                      (browsingCrag.boulder_count ?? 0) === 1 ? 'boulder' : 'boulders',
                    )}
                  </Text>
                </View>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {browsingCragWalls && browsingCragWalls.length > 0 ? (
                browsingCragWalls.map((wall) => {
                  /* BU — style-level breakdown per user 2026-06-07 一级
                     design: Boulder / Sport / Trad. Render non-zero
                     primary segments; fall back to total `X routes` when
                     all 3 are 0 (e.g. toprope-only wall — `other_count`
                     not surfaced in BU; future BU-FU adds 二级 tags). */
                  const b = wall.boulder_count ?? 0;
                  const sp = wall.sport_count ?? 0;
                  const tr_ = wall.trad_count ?? 0;
                  const hasPrimary = b > 0 || sp > 0 || tr_ > 0;
                  const primaryLabel = hasPrimary
                    ? [
                        b > 0 ? `${b} ${tr('抱石', 'boulder')}` : null,
                        sp > 0 ? `${sp} ${tr('运动', 'sport')}` : null,
                        tr_ > 0 ? `${tr_} ${tr('传统', 'trad')}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : `${wall.route_count} ${tr(
                        '条',
                        wall.route_count === 1 ? 'route' : 'routes',
                      )}`;
                  return (
                    <TouchableOpacity
                      key={wall.id}
                      activeOpacity={0.7}
                      onPress={() => onPressBrowseWall?.(wall)}
                      style={s.browseWallRow}
                    >
                      <Text style={s.browseWallName} numberOfLines={1}>
                        {wall.name}
                      </Text>
                      <View style={s.browseWallMetaRow}>
                        <Text style={s.browseWallCount}>{primaryLabel}</Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={colors.textTertiary}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={s.emptyText}>
                  {tr('加载岩壁中…', 'Loading walls…')}
                </Text>
              )}
            </>
          ) : walls.length > 0 ? (
            walls.map((wall) => (
              <WallGroup
                key={wall.id}
                wall={wall}
                onRoutePress={onPressRoute}
                highlightedRouteId={highlightedRouteId}
              />
            ))
          ) : (
            <Text style={s.emptyText}>
              {tr('点击地图上的圆点查看路线', 'Tap a pin on the map to see routes')}
            </Text>
          )}
        </ScrollView>
      </TopFadeMaskView>

      {/* Pinned header overlay — sits on top of TopFadeMaskView so the
          alpha gradient fades scroll content behind it. Mirrors
          gym/[gymId].tsx pattern. Area mode only — list mode has its
          own native sheet title via expo-router. */}
      {showPinnedHeader ? (
        <View style={s.pinnedHeaderOverlay} pointerEvents="box-none">
          <View style={s.headerTopRow}>
            <GlassUnionPill
              axis="horizontal"
              unionId="sheet-left-pill"
              containerSpacing={0}
              buttonSize={44}
              style={{ width: 88, height: 44 }}
              items={
                [
                  {
                    key: 'search',
                    kind: 'icon',
                    icon: 'magnifyingglass',
                    fontSize: 18,
                    onPress: onPressSearch,
                  },
                  {
                    key: 'community',
                    kind: 'icon',
                    icon: 'person.2',
                    fontSize: 18,
                    onPress: onPressCommunity,
                  },
                ] satisfies GlassUnionPillItem[]
              }
            />

            <TouchableOpacity
              onPress={onPressTitle}
              activeOpacity={0.6}
              hitSlop={8}
              style={s.headerTitleFlex}
            >
              {/* PLAN §3.2 2-row pattern:
               *   row 1 (this slot) — small Crag subtitle when wall focused
               *   row 2 (below) — large Wall title
               * Day 2 default (wallName unset) keeps the legacy single-row
               * behavior with Crag name as the only title. */}
              {wallName ? (
                <>
                  <Text style={s.headerSubtitleSmall} numberOfLines={1}>
                    {titleText}
                  </Text>
                  <Text
                    style={s.headerTitleLarge}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {wallName}
                  </Text>
                </>
              ) : (
                <Text
                  style={s.headerAreaName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {titleText}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ width: 44, height: 44 }}>
              <HeaderButton
                icon="line.3.horizontal"
                variant="glass"
                size={44}
                onPress={onPressHamburger}
              />
            </View>
          </View>

          {/* Day 6 wires FilterChipsBar here. Day 2 ships unmounted. */}
          {filterChipsSlot ? (
            <View style={s.filterChipsRow}>{filterChipsSlot}</View>
          ) : null}
        </View>
      ) : null}
    </>
  );
};

export default RoutesListSheet;

// ---- styles ----

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    pinnedHeaderOverlay: {
      // Absolute-positioned pinned header sitting on top of the
      // TopFadeMaskView. Sheet edges have 16pt symmetric inset.
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      gap: 8,
      zIndex: 10,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    filterChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 4,
    },
    headerTitleFlex: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 0,
    },
    headerAreaName: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      textTransform: 'uppercase',
      color: c.textPrimary,
      flexShrink: 1,
    },
    headerSubtitleSmall: {
      // PLAN §3.2 row 1 — small Crag subtitle when wall focused.
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      flexShrink: 1,
    },
    headerTitleLarge: {
      // PLAN §3.2 row 2 — large bold Wall title.
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      flexShrink: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 8,
      gap: 8,
    },
    sheetTitleText: { flex: 1, fontFamily: theme.fonts.bold, fontSize: 15, color: c.textPrimary },
    sheetBody: { paddingHorizontal: 8, paddingTop: 4 },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: 40,
    },
    // BS-FU-A — crag-browse mini snapshot + walls list rows.
    browseSnapshot: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 8,
      marginBottom: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: c.sheetCardBackground,
      borderRadius: 12,
      gap: 12,
    },
    browseSnapshotTextBlock: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    browseSnapshotName: {
      fontFamily: theme.fonts.bold,
      fontSize: 17,
      color: c.textPrimary,
    },
    browseSnapshotSubtitle: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
    browseSnapshotMeta: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 2,
    },
    browseWallRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginHorizontal: 8,
      marginBottom: 6,
      backgroundColor: c.sheetCardBackground,
      borderRadius: 10,
      gap: 12,
    },
    browseWallName: {
      flex: 1,
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textPrimary,
    },
    browseWallMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    browseWallCount: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
    },
  });
