import { useCallback, useEffect, useRef, useState } from 'react';

import useFavoriteRegionsStore from '../../store/useFavoriteRegionsStore';
import { outdoorApi } from './api';
import type {
  AreaSearchResponse, CoverageResponse, DisplayKind,
  OutdoorAreaDetail, OutdoorAreaListItem, SearchResult,
} from './types';

/**
 * Standalone Region favorite toggle. Thin wrapper over the shared
 * `useFavoriteRegionsStore` zustand state so multiple components
 * (AreaInfoSheet writer, GymsSavedSpotsRow reader) stay in sync without
 * each one running its own /regions/favorites fetch.
 *
 * Toggle signature accepts the full Region so the saved-spots strip can
 * render avatar + name immediately when a user favorites a new region
 * inside the info sheet.
 *
 * Function name kept as `useAreaFavoriteToggle` for caller minimum-diff;
 * Track D will rename.
 */
export function useAreaFavoriteToggle() {
  const isFavorited = useFavoriteRegionsStore((s) => s.isFavorited);
  const toggle = useFavoriteRegionsStore((s) => s.toggle);
  const loaded = useFavoriteRegionsStore((s) => s.loaded);
  const hydrate = useFavoriteRegionsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { isFavorited, toggle, loaded };
}

/**
 * BR Track D — derive a one-line subtitle for a cross-level search result row.
 *
 * Centralizes the per-`type` formatting so the search results UI stays
 * dumb (just render `${name}\n${getSearchHitMetaLabel(hit)}`). Mirrors
 * BE field nullability — keeps zero-fallback consistent across icons.
 */
export function getSearchHitMetaLabel(hit: SearchResult): string {
  switch (hit.type) {
    case 'route':
      return [hit.grade_text, hit.crag_name].filter(Boolean).join(' · ');
    case 'wall':
      return [hit.crag_name, hit.route_count != null ? `${hit.route_count} routes` : null]
        .filter(Boolean).join(' · ');
    case 'crag':
      return [hit.area_name, hit.route_count != null ? `${hit.route_count} routes` : null]
        .filter(Boolean).join(' · ');
    case 'area':
      return [hit.region_name, hit.route_count != null ? `${hit.route_count} routes` : null]
        .filter(Boolean).join(' · ');
    case 'region':
      return hit.route_count != null ? `${hit.route_count} routes` : '';
  }
}

// ════════════════════════════════════════════════════════════════
//  CA Phase 3 — outdoor_areas read hooks
//  Thin async-state wrappers around outdoorApi.getArea*. Callers can
//  swap to react-query/SWR later; pattern intentionally matches the
//  existing manual-state pattern in this file (no new deps).
// ════════════════════════════════════════════════════════════════

type LoadState<T> = {
  data: T | null;
  loading: boolean;
  error: unknown | null;
};

/** Generic single-fetch with cancellation on unmount / id change. */
function useFetchOnce<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
): LoadState<T> & { refetch: () => void } {
  const [state, setState] = useState<LoadState<T>>({
    data: null, loading: false, error: null,
  });
  // Track in-flight so refetch can preempt
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher(ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (!ctrl.signal.aborted) {
          setState({ data: null, loading: false, error });
        }
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return run();
  }, [run]);

  return { ...state, refetch: run };
}

/** GET /outdoor/areas/{id}. */
export function useAreaDetail(areaId: string | null | undefined) {
  return useFetchOnce<OutdoorAreaDetail>(
    () => outdoorApi.getArea(areaId!),
    [areaId],
  );
}

/** GET /outdoor/areas/{id}/children. */
export function useAreaChildren(
  areaId: string | null | undefined,
  opts?: { limit?: number },
) {
  return useFetchOnce<OutdoorAreaListItem[]>(
    () => outdoorApi.listAreaChildren(areaId!, opts),
    [areaId, opts?.limit],
  );
}

/** GET /outdoor/areas/{id}/coverage. Hard rule 4 errors surface via state.error. */
export function useAreaCoverage(areaId: string | null | undefined) {
  return useFetchOnce<CoverageResponse>(
    () => outdoorApi.getAreaCoverage(areaId!),
    [areaId],
  );
}

/** GET /outdoor/areas?bbox=...&display_kinds=... Zoom-aware pin source. */
export function useAreaBboxPins(params: {
  bbox: { south: number; west: number; north: number; east: number };
  displayKinds?: DisplayKind[];
  limit?: number;
  enabled?: boolean;
}) {
  const { bbox, displayKinds, limit, enabled = true } = params;
  const kindKey = (displayKinds ?? []).slice().sort().join(',');
  return useFetchOnce<OutdoorAreaListItem[]>(
    () => enabled
      ? outdoorApi.listAreasInBbox({ bbox, displayKinds, limit })
      : Promise.resolve([]),
    [bbox.south, bbox.west, bbox.north, bbox.east, kindKey, limit, enabled],
  );
}

/** GET /outdoor/areas/search?q=. Returns {items, total}. */
export function useAreaSearch(params: {
  q: string;
  displayKinds?: DisplayKind[];
  limit?: number;
  enabled?: boolean;
}) {
  const { q, displayKinds, limit, enabled = q.length >= 2 } = params;
  const kindKey = (displayKinds ?? []).slice().sort().join(',');
  return useFetchOnce<AreaSearchResponse>(
    () => enabled
      ? outdoorApi.searchAreas({ q, displayKinds, limit })
      : Promise.resolve({ items: [], total: 0 }),
    [q, kindKey, limit, enabled],
  );
}
