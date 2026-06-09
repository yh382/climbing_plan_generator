// src/features/mapscreen/components/OutdoorAreaInfoSheet.tsx
//
// CA Phase 4a — unified info sheet for ANY OutdoorArea (country / state /
// region / area / crag / wall). Replaces the 3-sheet trio (RegionInfoSheet
// / AreaInfoSheet / CragInfoSheet) per plan v8 §Phase 4.
//
// Section ordering by (has_subareas, has_routes) per plan v8:
//   subareas + routes  → Hero, Stats, Children, Routes, Actions, Metadata
//   subareas only      → Hero, Stats, Children, Actions, Metadata
//   routes only (leaf) → Hero, Stats, Routes, Actions, Metadata
//   empty              → Hero, Stats, Actions, Metadata
//
// CA Phase 4a scope: build sheet + 6 subcomponents as additions. DOES
// NOT yet replace usages of legacy sheets in MapScreenMapbox — that's
// Phase 4b (separate window). This file compiles standalone, calls
// CA Phase 2 endpoints via outdoorApi/hooks, and is ready for wiring.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useThemeColors } from '../../../lib/useThemeColors';
import { outdoorApi } from '../../outdoor/api';
import {
  useAreaChildren,
  useAreaDetail,
} from '../../outdoor/hooks';
import type {
  DisplayKind,
  OutdoorAreaDetail,
  OutdoorAreaListItem,
  OutdoorRoute,
} from '../../outdoor/types';

/**
 * Minimal seed for instant-paint Hero before useAreaDetail lands.
 * Required: id + name + display_kind. Everything else fills sensible
 * defaults (so callers from search/saved-spots/pin-tap don't need to
 * construct a full OutdoorArea object).
 */
export type AreaSeedInput = {
  id: string;
  name: string;
  display_kind: DisplayKind;
  name_en?: string | null;
  lat?: number | null;
  lng?: number | null;
  cover_url?: string | null;
  /** When known (e.g. from CragOverview), surfaces as parent badge below
   *  the title until ancestors breadcrumb hydrates from detail. */
  parent_name_hint?: string | null;
  /** Coarse pin-time hints; replaced by detail once it loads. */
  direct_route_count?: number;
  subtree_route_count?: number;
  direct_child_count?: number;
};

/**
 * Maps a child row (`OutdoorAreaListItem`) into the sheet's seed shape.
 * Used by all 4 sheet hosts to wire `onChildTap` → re-present the sheet
 * with the child as new browsing context (drill-in). Centralized here so
 * the call site stays a one-liner and the mapping stays consistent.
 *
 * Drill-in semantics: by definition a child row is a direct descendant
 * of currently-browsing, so the 4-case classifyAreaTap matrix collapses
 * to the trivial drill-in case — no extra dispatch needed.
 */
export function areaListItemToSeed(item: OutdoorAreaListItem): AreaSeedInput {
  return {
    id: item.id,
    name: item.name,
    display_kind: item.display_kind,
    name_en: item.name_en ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    direct_route_count: item.direct_route_count,
    subtree_route_count: item.subtree_route_count,
    direct_child_count: item.direct_child_count,
  };
}

import { AreaActions } from './outdoor-area-sheet/AreaActions';
import { AreaChildrenList } from './outdoor-area-sheet/AreaChildrenList';
import { AreaHero } from './outdoor-area-sheet/AreaHero';
import { AreaMetadata } from './outdoor-area-sheet/AreaMetadata';
import { AreaRoutesPreview } from './outdoor-area-sheet/AreaRoutesPreview';
import { AreaStats } from './outdoor-area-sheet/AreaStats';

export type OutdoorAreaInfoSheetHandle = {
  present: (seed: AreaSeedInput) => Promise<void>;
  dismiss: () => Promise<void>;
};

export type OutdoorAreaInfoSheetProps = {
  /** Called when user taps a child area row inside the sheet. Parent
   *  decides what to do (drill in via classifyAreaTap dispatch). */
  onChildTap?: (child: OutdoorAreaListItem) => void;
  /** Called when user taps a route row. */
  onRouteTap?: (route: OutdoorRoute) => void;
  /** Bookmark wiring — parent owns saved-spots store, passes current
   *  state + toggle. */
  isSaved?: (areaId: string) => boolean;
  onToggleSave?: (area: OutdoorAreaDetail) => void | Promise<void>;
  saveLoading?: boolean;
  /** Fired right after `present()` resolves. Parents can mirror the
   *  open state to back-button handlers (Apple Maps POI pattern). */
  onPresented?: () => void;
  /** Fired when TrueSheet dismisses (drag-down / programmatic). */
  onDismissed?: () => void;
};

const OutdoorAreaInfoSheet = forwardRef<
  OutdoorAreaInfoSheetHandle,
  OutdoorAreaInfoSheetProps
>(({
  onChildTap, onRouteTap, isSaved, onToggleSave, saveLoading,
  onPresented, onDismissed,
}, ref) => {
  const colors = useThemeColors();
  const sheetRef = useRef<TrueSheet>(null);

  // Minimal seed for instant-paint header. null when sheet closed.
  const [seed, setSeed] = useState<AreaSeedInput | null>(null);
  // Routes lazy fetch — sheet doesn't request until area has direct routes.
  const [routes, setRoutes] = useState<OutdoorRoute[] | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    present: async (s) => {
      setSeed(s);
      setRoutes(null);
      await sheetRef.current?.present();
      onPresented?.();
    },
    dismiss: async () => {
      await sheetRef.current?.dismiss();
    },
  }), []);

  const seedId = seed?.id ?? null;
  const { data: detail, loading: detailLoading } = useAreaDetail(seedId);
  const { data: children, loading: childrenLoading } = useAreaChildren(seedId);

  // Lazy load direct routes ONLY when the detail says has_routes.
  // Avoids 200-route fetch for region-level areas.
  useEffect(() => {
    if (!seedId || !detail?.has_routes) {
      setRoutes(null);
      return;
    }
    let cancelled = false;
    setRoutesLoading(true);
    outdoorApi.listAreaRoutes(seedId, { limit: 200 })
      .then((rows) => { if (!cancelled) setRoutes(rows); })
      .catch(() => { if (!cancelled) setRoutes([]); })
      .finally(() => { if (!cancelled) setRoutesLoading(false); });
    return () => { cancelled = true; };
  }, [seedId, detail?.has_routes]);

  // Detail takes precedence for full rendering; seed is instant-paint
  // header only (id + name + display_kind). Counts/flags from detail
  // when present, otherwise from seed hints, otherwise default to 0/false.
  const display = useMemo(() => {
    if (detail) {
      return {
        kind: 'detail' as const,
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
      const children = seed.direct_child_count ?? 0;
      return {
        kind: 'seed' as const,
        id: seed.id,
        name: seed.name,
        name_en: seed.name_en ?? null,
        display_kind: seed.display_kind,
        lat: seed.lat ?? null,
        lng: seed.lng ?? null,
        cover_url: seed.cover_url ?? null,
        direct_route_count: direct,
        subtree_route_count: subtree,
        direct_child_count: children,
        has_routes: direct > 0,
        has_subareas: children > 0,
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

  const saved = display && isSaved ? isSaved(display.id) : false;

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.5, 1]}
      cornerRadius={20}
      onDidDismiss={() => {
        setSeed(null);
        setRoutes(null);
        onDismissed?.();
      }}
      backgroundColor={colors.sheetBackground}
    >
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.sheetBackground }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {display ? (
          <>
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

            {/* Children-first ordering: subareas before routes */}
            {display.has_subareas ? (
              <AreaChildrenList
                children={children}
                loading={childrenLoading}
                onChildTap={(child) => onChildTap?.(child)}
              />
            ) : null}

            {display.has_routes ? (
              <AreaRoutesPreview
                routes={routes}
                loading={routesLoading}
                onRouteTap={onRouteTap}
              />
            ) : null}

            <AreaActions
              areaId={display.id}
              areaName={display.name}
              lat={display.lat}
              lng={display.lng}
              saved={saved}
              saveLoading={saveLoading}
              // Forward only when the parent wired bookmark + detail is
              // hydrated. AreaActions hides the Save row when this prop
              // is undefined, so callers without a saved-store stay clean.
              onToggleSave={
                onToggleSave && detail
                  ? () => onToggleSave(detail)
                  : undefined
              }
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
          </>
        ) : null}

        {/* Bottom padding so last section clears safe area */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </TrueSheet>
  );
});

OutdoorAreaInfoSheet.displayName = 'OutdoorAreaInfoSheet';

export default OutdoorAreaInfoSheet;

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 8,
  },
});
