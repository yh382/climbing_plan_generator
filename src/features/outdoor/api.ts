// src/features/outdoor/api.ts
// API layer for the outdoor module.
//
// CA single-tree model (post Phase 6.2): every node is an `outdoor_area`;
// the canonical read surface is the `/outdoor/areas/*` family below.
// CA-FU Phase B deleted the legacy 4-level read methods with no live callers
// (getAreas / getCrags / getWalls / getRoutes / nearbyRegions / the 3 /v2
// legacy aliases / searchOutdoor) — their BE endpoints 404 post-6.2.
// `search` + `getCragDetail` stay (still-404) until the redesign branch
// retires their entangled callers.

import { api } from '../../lib/apiClient';
import type {
  Region, OutdoorRoute,
  RouteRating, RouteAscent,
  RoutePinsResponse, CragDetail,
  // CA Phase 3 — outdoor_areas single tree
  OutdoorAreaDetail, OutdoorAreaListItem, CoverageResponse,
  AreaSearchResponse, DisplayKind,
  // CA-FU Phase B — compact crag preload
  CragPinsResponse,
  // CB Phase F — selected-pin ring composition
  AreaComposition,
} from './types';
import { MOCK_REGIONS, MOCK_ROUTES } from './mockData';

/** BR Track D — bbox + filter params for /outdoor/pins. */
export type ListPinsParams = {
  bbox: { south: number; west: number; north: number; east: number };
  /** csv of OutdoorRoute.style values (FE normalizes case to match BE). */
  style?: string;
  discipline?: 'boulder' | 'rope' | 'other';
  /** Default 5000 BE-side; raise only for full-NA exports. */
  limit?: number;
};

/** CB 点6 — viewport browse-sheet title (representative 'area' node).
 *  All-null when the viewport has no route-bearing areas. */
export type RegionLabel = {
  id: string | null;
  name: string | null;
  display_kind: DisplayKind | null;
};

// BK: flipped off — real OpenBeta data now lives in prod DB. Keeping the
// `if (USE_MOCK)` branches as escape hatch if we ever need to demo
// offline; flip back to `__DEV__` temporarily for that case.
const USE_MOCK = false;

// ---- Mock helpers ----

function allMockRoutes(): OutdoorRoute[] {
  return Object.values(MOCK_ROUTES).flat();
}

// ---- API ----

export const outdoorApi = {
  // ---- Regions (top level) ----
  listRegions: async (_params?: { country?: string; status?: string }): Promise<Region[]> => {
    if (USE_MOCK) return MOCK_REGIONS;
    // CA Phase 6.2 — legacy /regions endpoint deleted. Read region-tier
    // areas from the canonical outdoor_areas tree via a worldwide bbox
    // query filtered to display_kind='region'. The OutdoorAreaListItem
    // shape doesn't cleanly match Region, so we shim to the legacy shape
    // here. Future: callers should accept OutdoorAreaListItem directly.
    const list = await outdoorApi.listAreasInBbox({
      bbox: { south: -90, west: -180, north: 90, east: 180 },
      displayKinds: ['region'],
      limit: 2000,
    });
    return list.map((item) => ({
      id: item.id,
      name: item.name,
      name_en: item.name_en ?? undefined,
      country: '',  // not on tree items; legacy shape filler
      lat: item.lat ?? undefined,
      lng: item.lng ?? undefined,
      cover_url: undefined,
      status: 'approved',
    })) as Region[];
  },

  getRegion: async (id: string): Promise<Region | null> => {
    if (USE_MOCK) return MOCK_REGIONS.find((r) => r.id === id) ?? null;
    // CA Phase 6.2 — legacy /regions/{id} endpoint deleted. Use
    // /outdoor/areas/{id} + shim to Region shape for legacy callers
    // (OfflineMapsSheet / OfflineDownloadPicker / GymsScreen).
    const detail = await outdoorApi.getArea(id);
    return {
      id: detail.id,
      name: detail.name,
      name_en: detail.name_en ?? undefined,
      country: '',
      lat: detail.lat ?? undefined,
      lng: detail.lng ?? undefined,
      cover_url: detail.cover_url ?? undefined,
      status: 'approved',
    } as Region;
  },

  // CA Phase 6.1 — favoriteRegion / unfavoriteRegion / listFavoriteRegions
  // removed. Region bookmarks now live in the polymorphic saved-spots
  // store (`savedSpotsApi` with target_type='outdoor_area').

  // ---- Route detail ----
  getRoute: async (id: string): Promise<OutdoorRoute | null> => {
    if (USE_MOCK) return allMockRoutes().find((r) => r.id === id) ?? null;
    return api.get<OutdoorRoute>(`/outdoor/routes/${id}`);
  },

  getAscents: async (routeId: string): Promise<RouteAscent[]> => {
    return api.get<RouteAscent[]>(`/outdoor/routes/${routeId}/ascents`);
  },

  getRatings: async (routeId: string): Promise<RouteRating[]> => {
    return api.get<RouteRating[]>(`/outdoor/routes/${routeId}/ratings`);
  },

  rateRoute: async (routeId: string, data: { stars: number; comment?: string }) => {
    if (USE_MOCK) return { ok: true };
    return api.post<{ ok: boolean }>(`/outdoor/routes/${routeId}/rate`, data);
  },

  // CA-FU Phase E — submitRoute deleted with AddRouteSheet (route submission
  // moves to the 6.FU-2 admin writer window).

  // CA-FU Phase D — `search` (/outdoor/search 404) deleted; callers migrated
  // to listAreaRoutes / searchAreas. `listCragsOverview` stub deleted
  // (superseded by listAllCrags). `getCragDetail` (/outdoor/crags/{id} 404)
  // deleted with the legacy wall/crag state machine.

  // ---- BR Track D — Bbox climb-coord cluster source (PLAN §2.1) ----
  //
  // Returns flat per-route pins (no aggregation) inside the bbox.
  listPins: async (params: ListPinsParams): Promise<RoutePinsResponse> => {
    const { south, west, north, east } = params.bbox;
    const qs = new URLSearchParams({
      bbox: `${south},${west},${north},${east}`,
    });
    if (params.style) qs.set('style', params.style);
    if (params.discipline) qs.set('discipline', params.discipline);
    if (params.limit) qs.set('limit', String(params.limit));
    return api.get<RoutePinsResponse>(`/outdoor/pins?${qs}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  CA Phase 3 — outdoor_areas single-tree endpoints (BE Phase 2)
  //  These replace the 5-layer Region/Area/Crag/Wall queries.
  //  Plan v8 §Phase 3: route through api.ts ONLY (never inline fetch).
  // ════════════════════════════════════════════════════════════════

  /** Detail + ancestors breadcrumb + location_audit (single fetch). */
  getArea: async (areaId: string): Promise<OutdoorAreaDetail> => {
    return api.get<OutdoorAreaDetail>(`/outdoor/areas/${areaId}`);
  },

  /** Direct children, sorted by subtree_route_count desc (children-first UX).
   *  `displayKinds` filters client-side (BE /children has no kind filter). */
  listAreaChildren: async (
    areaId: string,
    opts?: { limit?: number; displayKinds?: DisplayKind[] },
  ): Promise<OutdoorAreaListItem[]> => {
    const qs = new URLSearchParams();
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    const children = await api.get<OutdoorAreaListItem[]>(
      `/outdoor/areas/${areaId}/children${suffix}`,
    );
    if (opts?.displayKinds?.length) {
      const kinds = new Set(opts.displayKinds);
      return children.filter((c) => kinds.has(c.display_kind));
    }
    return children;
  },

  /** Routes attached to area. include_descendants=true walks subtree. */
  listAreaRoutes: async (
    areaId: string,
    opts?: { includeDescendants?: boolean; limit?: number; offset?: number },
  ): Promise<OutdoorRoute[]> => {
    const qs = new URLSearchParams();
    if (opts?.includeDescendants) qs.set('include_descendants', 'true');
    if (opts?.limit) qs.set('limit', String(opts.limit));
    if (opts?.offset) qs.set('offset', String(opts.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return api.get<OutdoorRoute[]>(
      `/outdoor/areas/${areaId}/routes${suffix}`,
    );
  },

  /** Coverage polygon (convex hull). Hard rule 4: 422 on country/state +
   *  >5000-route subtree; null polygon when <3 route points. */
  getAreaCoverage: async (areaId: string): Promise<CoverageResponse> => {
    return api.get<CoverageResponse>(`/outdoor/areas/${areaId}/coverage`);
  },

  // CB Phase F — single-area 4-bucket style composition for the selected-pin
  // ratio ring. Called per pin tap (1 area), not per viewport.
  getAreaComposition: async (areaId: string): Promise<AreaComposition> => {
    return api.get<AreaComposition>(
      `/outdoor/areas/${areaId}/discipline-composition`,
    );
  },

  /** CB 点6 — representative 'area' label for the camera viewport, for the
   *  browse-sheet title (tracks the camera, not a tapped pin). */
  getRegionLabel: async (bbox: {
    south: number; west: number; north: number; east: number;
  }): Promise<RegionLabel> => {
    const { south, west, north, east } = bbox;
    const qs = new URLSearchParams({
      south: String(south), west: String(west),
      north: String(north), east: String(east),
    });
    return api.get<RegionLabel>(`/outdoor/region-label?${qs}`);
  },

  /** CB 点3 — routes within radius of a center point (camera-radius browse).
   *  Same row shape + crag·area breadcrumb as listAreaRoutes. */
  listNearbyRoutes: async (params: {
    lat: number; lng: number; radiusMi?: number;
    style?: string; discipline?: 'boulder' | 'rope' | 'other'; limit?: number;
  }): Promise<OutdoorRoute[]> => {
    const qs = new URLSearchParams({
      lat: String(params.lat), lng: String(params.lng),
    });
    if (params.radiusMi) qs.set('radius_mi', String(params.radiusMi));
    if (params.style) qs.set('style', params.style);
    if (params.discipline) qs.set('discipline', params.discipline);
    if (params.limit) qs.set('limit', String(params.limit));
    return api.get<OutdoorRoute[]>(`/outdoor/routes/nearby?${qs}`);
  },

  /** Zoom-aware pin source. display_kinds filters which tier surfaces. */
  listAreasInBbox: async (params: {
    bbox: { south: number; west: number; north: number; east: number };
    displayKinds?: DisplayKind[];
    limit?: number;
  }): Promise<OutdoorAreaListItem[]> => {
    const { south, west, north, east } = params.bbox;
    const qs = new URLSearchParams({
      south: String(south),
      west: String(west),
      north: String(north),
      east: String(east),
    });
    for (const k of params.displayKinds ?? []) {
      qs.append('display_kinds', k);
    }
    if (params.limit) qs.set('limit', String(params.limit));
    return api.get<OutdoorAreaListItem[]>(`/outdoor/areas?${qs}`);
  },

  /** Area name search. Min 2 chars (BE returns 422 below). */
  searchAreas: async (params: {
    q: string;
    displayKinds?: DisplayKind[];
    limit?: number;
  }): Promise<AreaSearchResponse> => {
    const qs = new URLSearchParams({ q: params.q });
    for (const k of params.displayKinds ?? []) {
      qs.append('display_kinds', k);
    }
    if (params.limit) qs.set('limit', String(params.limit));
    return api.get<AreaSearchResponse>(`/outdoor/areas/search?${qs}`);
  },

  /** CA-FU Phase B — compact preload of every visible crag-tier area
   *  (USA v1). Public, edge-cached, ~35k items. Consumed by useAllCrags
   *  (AsyncStorage SWR + data_version hot-swap). */
  listAllCrags: async (): Promise<CragPinsResponse> => {
    return api.get<CragPinsResponse>('/outdoor/areas/crags');
  },
};
