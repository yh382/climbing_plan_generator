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
  OutdoorArea,
  OutdoorAreaDetail,
  OutdoorAreaListItem,
  OutdoorRoute,
} from '../../outdoor/types';

import { AreaActions } from './outdoor-area-sheet/AreaActions';
import { AreaChildrenList } from './outdoor-area-sheet/AreaChildrenList';
import { AreaHero } from './outdoor-area-sheet/AreaHero';
import { AreaMetadata } from './outdoor-area-sheet/AreaMetadata';
import { AreaRoutesPreview } from './outdoor-area-sheet/AreaRoutesPreview';
import { AreaStats } from './outdoor-area-sheet/AreaStats';

export type OutdoorAreaInfoSheetHandle = {
  present: (area: OutdoorArea | OutdoorAreaListItem) => Promise<void>;
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
};

const OutdoorAreaInfoSheet = forwardRef<
  OutdoorAreaInfoSheetHandle,
  OutdoorAreaInfoSheetProps
>(({
  onChildTap, onRouteTap, isSaved, onToggleSave, saveLoading,
}, ref) => {
  const colors = useThemeColors();
  const sheetRef = useRef<TrueSheet>(null);

  // Seed area (instant paint header). null when sheet closed.
  const [seed, setSeed] = useState<OutdoorArea | OutdoorAreaListItem | null>(null);
  // Routes lazy fetch — sheet doesn't request until area has direct routes.
  const [routes, setRoutes] = useState<OutdoorRoute[] | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    present: async (area) => {
      setSeed(area);
      setRoutes(null);
      await sheetRef.current?.present();
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

  // Section ordering: caller can decide which sections to render based
  // on flags. We render conditionally and always end with Actions +
  // Metadata regardless of flags (per plan v8 ordering table).
  const display = useMemo(() => {
    // detail (full) takes precedence; seed used for instant paint only.
    const area: (OutdoorArea | OutdoorAreaDetail | OutdoorAreaListItem | null) =
      detail ?? seed;
    if (!area) return null;
    return area;
  }, [detail, seed]);

  const parentName = useMemo(() => {
    if (detail?.ancestors && detail.ancestors.length > 0) {
      return detail.ancestors[detail.ancestors.length - 1].name;
    }
    return null;
  }, [detail]);

  const saved = display && isSaved ? isSaved(display.id) : false;

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.5, 1]}
      cornerRadius={20}
      onDidDismiss={() => {
        setSeed(null);
        setRoutes(null);
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
              nameEn={(display as OutdoorArea).name_en ?? null}
              displayKind={display.display_kind}
              coverUrl={(display as OutdoorArea).cover_url ?? null}
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
              lat={(display as OutdoorArea).lat ?? null}
              lng={(display as OutdoorArea).lng ?? null}
              saved={saved}
              saveLoading={saveLoading}
              onToggleSave={() => {
                if (detail && onToggleSave) {
                  return onToggleSave(detail);
                }
              }}
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
