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
  OutdoorAreaDetail,
  OutdoorAreaListItem,
  OutdoorRoute,
} from '../../outdoor/types';

// CD Phase 1a — AreaSeedInput + areaListItemToSeed moved to the neutral
// outdoor-area-sheet/shared module so they survive this sheet's deletion
// in 1b. Re-imported here for internal use (seed state + present handle).
import { type AreaSeedInput } from './outdoor-area-sheet/shared';

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
