import { useCallback, useEffect, useRef, useState } from 'react';

import { outdoorApi, type RegionLabel } from './api';
import type {
  AreaSearchResponse, CoverageResponse, DisplayKind,
  OutdoorAreaDetail, OutdoorAreaListItem, OutdoorRoute, SearchResult,
} from './types';

// CA Phase 6.1 — `useAreaFavoriteToggle` removed. The legacy region-only
// favorite store + its lone wrapper hook had 0 alive callers after Phase 4b
// deleted RegionInfoSheet (the only writer). Region bookmarks now flow
// through the polymorphic `savedSpotsApi` (target_type='region').

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

/** GET /outdoor/areas/{id}. Returns {data: null, loading: false} when areaId is null/undefined. */
export function useAreaDetail(areaId: string | null | undefined) {
  return useFetchOnce<OutdoorAreaDetail | null>(
    () => areaId ? outdoorApi.getArea(areaId) : Promise.resolve(null),
    [areaId],
  );
}

/** GET /outdoor/areas/{id}/children. No-op when areaId is null/undefined. */
export function useAreaChildren(
  areaId: string | null | undefined,
  opts?: { limit?: number },
) {
  return useFetchOnce<OutdoorAreaListItem[]>(
    () => areaId
      ? outdoorApi.listAreaChildren(areaId, opts)
      : Promise.resolve([]),
    [areaId, opts?.limit],
  );
}

/** GET /outdoor/areas/{id}/routes (direct only). BE returns them in the
 *  CA-FU Q4 default order (stars DESC NULLS LAST, send_count DESC,
 *  grade_score ASC) — consumers render as-is, no client re-sort.
 *  includeDescendants is intentionally NOT exposed: browse is children-first,
 *  a crag is a leaf, and pulling the whole subtree here is a footgun. */
export function useAreaRoutes(
  areaId: string | null | undefined,
  opts?: { limit?: number },
) {
  return useFetchOnce<OutdoorRoute[]>(
    () => areaId
      ? outdoorApi.listAreaRoutes(areaId, {
          includeDescendants: false,
          limit: opts?.limit,
        })
      : Promise.resolve([]),
    [areaId, opts?.limit],
  );
}

/** GET /outdoor/areas/{id}/coverage. Hard rule 4 errors surface via state.error.
 *  No-op when areaId is null/undefined. */
export function useAreaCoverage(areaId: string | null | undefined) {
  return useFetchOnce<CoverageResponse | null>(
    () => areaId ? outdoorApi.getAreaCoverage(areaId) : Promise.resolve(null),
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

/**
 * CB 点6 — debounced viewport region label for the browse-sheet title.
 *
 * Tracks the camera (not a tapped pin). Hysteresis: only swaps the title when
 * a real label arrives, so transient null results (empty viewport mid-pan)
 * keep the previous title instead of flickering. Resets to null when disabled
 * (leaving browse mode) and degrades to null on error → the caller falls back
 * to the area name.
 */
export function useRegionLabel(
  bbox: { south: number; west: number; north: number; east: number } | null,
  enabled: boolean,
): RegionLabel | null {
  const [label, setLabel] = useState<RegionLabel | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLabel(null);
      return;
    }
    if (!bbox) return;
    const timer = setTimeout(() => {
      const seq = ++seqRef.current;
      outdoorApi
        .getRegionLabel(bbox)
        .then((res) => {
          if (seq !== seqRef.current) return;
          if (res && res.name) setLabel(res); // hysteresis — ignore null blips
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox?.south, bbox?.west, bbox?.north, bbox?.east, enabled]);

  return label;
}

/**
 * CB 点3 — debounced routes within `radiusMi` of a camera center, for the
 * browse sheet's camera-radius list. Keeps the previous results while
 * refetching (no blank flash mid-pan). Returns {data, loading}.
 */
export function useNearbyRoutes(
  center: { lat: number; lng: number } | null,
  opts?: { radiusMi?: number; enabled?: boolean; debounceMs?: number },
): { data: OutdoorRoute[] | null; loading: boolean } {
  const { radiusMi = 10, enabled = true, debounceMs = 350 } = opts ?? {};
  const [data, setData] = useState<OutdoorRoute[] | null>(null);
  const [loading, setLoading] = useState(false);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled || !center) return;
    const timer = setTimeout(() => {
      const seq = ++seqRef.current;
      setLoading(true);
      outdoorApi
        .listNearbyRoutes({ lat: center.lat, lng: center.lng, radiusMi })
        .then((rows) => {
          if (seq !== seqRef.current) return;
          setData(rows);
          setLoading(false);
        })
        .catch(() => {
          if (seq === seqRef.current) setLoading(false);
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [center?.lat, center?.lng, radiusMi, enabled, debounceMs]);

  return { data, loading };
}
