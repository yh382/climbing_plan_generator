// src/features/mapscreen/components/OutdoorBrowseSheet.tsx
// CA-FU Phase C.3 — primary browse surface for the post-CA map.
// CD Phase 1a — upgraded to a tabbed area page (onX/MP model):
//
//   [ Overview | Routes / Areas ]
//
//   - Overview  → AreaHero + AreaStats + AreaActions + AreaMetadata
//                 (ported from OutdoorAreaInfoSheet). Instant-paints from a
//                 seed before useAreaDetail lands ("秒画").
//   - middle    → adapts to the (has_routes, has_subareas) matrix:
//                   crag (routes, no children) → "Routes" AreaRoutesBrowser
//                     (no-spatial branch: full filter/sort/cards, crag-own
//                      routes — NOT the CB nearby-radius list)
//                   has children               → "Areas" children-first list
//                     (+ direct-route preview when the node also has routes)
//
// Mounted as content inside MapScreenMapbox's primary TrueSheet (sibling
// pattern to SavedRoutesListSheet — not its own sheet host).
//
// Data hooks (useAreaDetail/Children/Routes) live at THIS host level and are
// keyed on areaId only, so switching tabs swaps the presentational subtree
// without re-fetching (S2 — preserves the instant paint).
//
// Title = breadcrumb: tapping it opens a native UIMenu of `path_ids`
// ancestors (from detail.ancestors); tapping an ancestor drills there.
//
// Note: lives under mapscreen/components (next to SavedRoutesListSheet,
// mounted by MapScreenMapbox) rather than the plan's outdoor/components, to
// keep the outdoor→mapscreen import direction one-way (it reuses mapscreen's
// outdoor-area-sheet/* subcomponents).

import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { HeaderButton } from '../../../components/ui/HeaderButton';
import { MenuPill } from '../../../components/ui/MenuPill';
import { NativeSegmentedControl } from '../../../components/ui/NativeSegmentedControl';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import {
  useAreaChildren,
  useAreaDetail,
  useAreaRoutes,
} from '../../outdoor/hooks';
import type {
  AncestorBreadcrumb,
  DisplayKind,
  OutdoorAreaListItem,
  OutdoorRoute,
} from '../../outdoor/types';
import { AreaActions } from './outdoor-area-sheet/AreaActions';
import { AreaChildrenList } from './outdoor-area-sheet/AreaChildrenList';
import { AreaHero } from './outdoor-area-sheet/AreaHero';
import { AreaMetadata } from './outdoor-area-sheet/AreaMetadata';
import { AreaRoutesPreview } from './outdoor-area-sheet/AreaRoutesPreview';
import { AreaRoutesBrowser } from './outdoor-area-sheet/AreaRoutesBrowser';
import { AreaStats } from './outdoor-area-sheet/AreaStats';
import {
  type AreaSeedInput,
  displayKindLabel,
  type ThemeColors,
} from './outdoor-area-sheet/shared';

export type TabKey = 'overview' | 'middle';

export type OutdoorBrowseSheetProps = {
  /** null = no browse target (empty placeholder). */
  areaId: string | null;
  /** CD 1a — instant-paint seed for the Overview hero before detail lands. */
  seed?: AreaSeedInput | null;
  /** CD 1a — controlled active tab. Lifted to the host so the floating glass
   *  footer (share + ♡) can render only on Overview, and so crag-pin entries
   *  default to Overview (host resets to 'overview' on every area change). */
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  insets: EdgeInsets;
  onPressRoute: (route: OutdoorRoute) => void;
  onPressChildArea: (child: OutdoorAreaListItem) => void;
  /** CD 1a — breadcrumb: tap an ancestor in the title menu to drill there. */
  onPressAncestor?: (ancestor: AncestorBreadcrumb) => void;
  /** Header hamburger → caller presents CragMenuSheet / Info (stacked). */
  onPressHamburger: () => void;

  // ── Deprecated (CB nearby-browse). Superseded by the crag-own Routes tab
  // in CD 1a; props kept so the call site stays compiling. Removed in 1b. ──
  /** @deprecated CD 1b — region-label title override (nearby-browse). */
  title?: string;
  /** @deprecated CD 1b */
  titleKind?: DisplayKind;
  /** @deprecated CD 1b */
  nearbyCenter?: { lat: number; lng: number } | null;
  /** @deprecated CD 1b */
  nearbyRoutes?: OutdoorRoute[] | null;
  /** @deprecated CD 1b */
  nearbyLoading?: boolean;
  /** @deprecated CD 1b */
  focusedCragId?: string | null;
  /** @deprecated CD 1b */
  onClearFocus?: () => void;
  /** @deprecated CD 1b */
  onLocateRoute?: (route: OutdoorRoute) => void;
  /** @deprecated CD 1b */
  browseDiscipline?: 'boulder' | 'rope';
  /** @deprecated CD 1b */
  onBrowseDiscipline?: (d: 'boulder' | 'rope') => void;
};

export function OutdoorBrowseSheet({
  areaId,
  seed,
  tab,
  onTabChange,
  insets,
  onPressRoute,
  onPressChildArea,
  onPressAncestor,
  onPressHamburger,
}: OutdoorBrowseSheetProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Host-level data — keyed on areaId only, so tab switches don't refetch.
  const { data: detail, loading: detailLoading } = useAreaDetail(areaId);
  const { data: children, loading: childrenLoading } = useAreaChildren(areaId);
  const { data: routes, loading: routesLoading } = useAreaRoutes(areaId);

  // Detail takes precedence; seed is instant-paint until detail lands.
  // Mirrors OutdoorAreaInfoSheet's display derivation.
  const display = useMemo(() => {
    if (detail) {
      return {
        id: detail.id,
        name: detail.name,
        name_en: detail.name_en,
        display_kind: detail.display_kind,
        lat: detail.lat,
        lng: detail.lng,
        cover_url: detail.cover_url,
        direct_route_count: detail.direct_route_count,
        subtree_route_count: detail.subtree_route_count,
        direct_child_count: detail.direct_child_count,
        has_routes: detail.has_routes,
        has_subareas: detail.has_subareas,
      };
    }
    if (seed) {
      const direct = seed.direct_route_count ?? 0;
      const subtree = seed.subtree_route_count ?? direct;
      const childCount = seed.direct_child_count ?? 0;
      return {
        id: seed.id,
        name: seed.name,
        name_en: seed.name_en ?? null,
        display_kind: seed.display_kind,
        lat: seed.lat ?? null,
        lng: seed.lng ?? null,
        cover_url: seed.cover_url ?? null,
        direct_route_count: direct,
        subtree_route_count: subtree,
        direct_child_count: childCount,
        has_routes: direct > 0,
        has_subareas: childCount > 0,
      };
    }
    return null;
  }, [detail, seed]);

  const parentName = useMemo(() => {
    if (detail?.ancestors && detail.ancestors.length > 0) {
      return detail.ancestors[detail.ancestors.length - 1].name;
    }
    return seed?.parent_name_hint ?? null;
  }, [detail, seed]);

  if (!areaId) {
    return (
      <View style={[styles.fill, styles.centerFill]}>
        <Text style={styles.placeholder}>
          {tr('点击地图上的岩点查看路线', 'Tap a crag on the map to view routes')}
        </Text>
      </View>
    );
  }

  const ancestors = detail?.ancestors ?? [];
  const headerTitle = display?.name ?? tr('加载中…', 'Loading…');
  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {ancestors.length > 0 && onPressAncestor ? (
          <MenuPill
            variant="labeled"
            label={headerTitle}
            accessibilityLabel={tr('上级区域', 'Parent areas')}
            options={ancestors.map((a) => ({
              label: a.name,
              onPress: () => onPressAncestor(a),
            }))}
          />
        ) : (
          <Text style={styles.title} numberOfLines={1}>
            {headerTitle}
          </Text>
        )}
        {display ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {displayKindLabel(display.display_kind, tr)}
          </Text>
        ) : null}
      </View>
      <HeaderButton
        icon="line.3.horizontal"
        variant="glass"
        size={44}
        onPress={onPressHamburger}
      />
    </View>
  );

  // Before any seed/detail: spinner (search/saved-spot entries with no seed).
  if (!display) {
    return (
      <View style={styles.fill}>
        {header}
        <View style={styles.centerFill}>
          {detailLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={styles.placeholder}>
              {tr('该区域暂无内容', 'Nothing here yet')}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const { has_routes: hasRoutes, has_subareas: hasSubareas } = display;
  const isCrag = hasRoutes && !hasSubareas;
  const middleLabel = hasSubareas ? tr('子区域', 'Areas') : tr('路线', 'Routes');

  return (
    <View style={styles.fill}>
      {header}

      <View style={styles.segmentWrap}>
        <NativeSegmentedControl
          options={[tr('概览', 'Overview'), middleLabel]}
          selectedIndex={tab === 'overview' ? 0 : 1}
          onSelect={(i) => onTabChange(i === 0 ? 'overview' : 'middle')}
        />
      </View>

      {tab === 'overview' ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AreaHero
            name={display.name}
            nameEn={display.name_en}
            displayKind={display.display_kind}
            coverUrl={display.cover_url}
            parentName={parentName}
          />
          <AreaStats
            directRouteCount={display.direct_route_count}
            subtreeRouteCount={display.subtree_route_count}
            directChildCount={display.direct_child_count}
          />
          <AreaActions
            areaId={display.id}
            areaName={display.name}
            lat={display.lat}
            lng={display.lng}
            saved={false}
            // Share lives in the floating footer now (CD 1a).
            showShare={false}
          />
          {detail ? (
            <AreaMetadata
              approach={detail.approach ?? null}
              description={detail.description ?? null}
              locationAudit={detail.location_audit ?? null}
              sourceExternalId={detail.source_external_id ?? null}
              source={detail.source}
            />
          ) : null}
        </ScrollView>
      ) : isCrag ? (
        // Crag: routes are primary. Full browser, no spatial scaffolding.
        <AreaRoutesBrowser
          key={areaId}
          routes={routes}
          loading={routesLoading}
          onRouteTap={onPressRoute}
        />
      ) : (
        // Intermediate: children-first, with a direct-route preview when the
        // node also carries direct routes.
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {hasSubareas ? (
            <AreaChildrenList
              children={children}
              loading={childrenLoading}
              onChildTap={onPressChildArea}
              maxRows={500}
            />
          ) : null}
          {hasRoutes ? (
            <AreaRoutesPreview
              routes={routes}
              loading={routesLoading}
              onRouteTap={onPressRoute}
              maxRows={50}
            />
          ) : null}
          {!hasSubareas && !hasRoutes ? (
            <View style={styles.centerFill}>
              <Text style={styles.placeholder}>
                {tr('该区域暂无内容', 'Nothing here yet')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

export default OutdoorBrowseSheet;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  fill: { flex: 1 },
  centerFill: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  headerText: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
});
