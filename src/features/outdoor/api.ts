// src/features/outdoor/api.ts
// API layer for outdoor module — 5-level hierarchy (post BR Track A rename):
//   Region → Area → Crag → Wall → Route
// Mock mode uses external mockData.ts; toggle USE_MOCK to false when backend is ready

import { api } from '../../lib/apiClient';
import type {
  Region, Area, Crag, Wall, OutdoorRoute,
  RouteRating, RouteAscent,
  RoutePinsResponse, CragDetail, CragOverview, SearchResult,
  // CA Phase 3 — outdoor_areas single tree
  OutdoorAreaDetail, OutdoorAreaListItem, CoverageResponse,
  AreaSearchResponse, LegacyAliasResponse, DisplayKind,
} from './types';
import {
  MOCK_REGIONS, MOCK_AREAS, MOCK_CRAGS, MOCK_WALLS, MOCK_ROUTES,
} from './mockData';

/** BR Track D — bbox + filter params for /outdoor/pins. */
export type ListPinsParams = {
  bbox: { south: number; west: number; north: number; east: number };
  /** csv of OutdoorRoute.style values (FE normalizes case to match BE). */
  style?: string;
  discipline?: 'boulder' | 'rope' | 'other';
  /** Default 5000 BE-side; raise only for full-NA exports. */
  limit?: number;
};

/** BR Track D — cross-level search params. */
export type SearchOutdoorParams = {
  q: string;
  /** Default = all 5 levels. */
  types?: Array<'region' | 'area' | 'crag' | 'wall' | 'route'>;
  /** Scope to a single region (used by InfoSheet search). */
  region_id?: string;
  limit?: number;
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
    const qs = new URLSearchParams();
    if (_params?.country) qs.set('country', _params.country);
    if (_params?.status) qs.set('status', _params.status);
    // BE returns PaginatedRegions { items, total, page, limit } — unwrap
    // here so the public contract stays Region[]. Pagination not yet
    // surfaced. BL post-ship we have 700+ regions so 2000 cap matches the
    // BE's new upper bound; beyond that we'd want viewport bbox filter.
    qs.set('limit', '2000');
    const page = await api.get<{ items: Region[]; total: number }>(`/regions?${qs}`);
    return page.items ?? [];
  },

  getRegion: async (id: string): Promise<Region | null> => {
    if (USE_MOCK) return MOCK_REGIONS.find((r) => r.id === id) ?? null;
    return api.get<Region>(`/regions/${id}`);
  },

  nearbyRegions: async (lat: number, lng: number, radiusKm: number): Promise<Region[]> => {
    if (USE_MOCK) return MOCK_REGIONS;
    return api.get<Region[]>(`/regions/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  },

  // CA Phase 6.1 — favoriteRegion / unfavoriteRegion / listFavoriteRegions
  // removed. Region bookmarks now live in the polymorphic saved-spots
  // store (`savedSpotsApi` with target_type='region', Phase 5.2). The
  // `user_favorite_regions` table is dropped by alembic
  // `phase61_drop_user_favorite_regions`.

  // ---- Hierarchy ----
  getAreas: async (regionId: string): Promise<Area[]> => {
    if (USE_MOCK) return MOCK_AREAS[regionId] ?? [];
    return api.get<Area[]>(`/outdoor/regions/${regionId}/areas`);
  },

  getCrags: async (areaId: string): Promise<Crag[]> => {
    if (USE_MOCK) return MOCK_CRAGS[areaId] ?? [];
    return api.get<Crag[]>(`/outdoor/areas/${areaId}/crags`);
  },

  getWalls: async (cragId: string): Promise<Wall[]> => {
    if (USE_MOCK) return MOCK_WALLS[cragId] ?? [];
    return api.get<Wall[]>(`/outdoor/crags/${cragId}/walls`);
  },

  getRoutes: async (wallId: string, _params?: { style?: string; sort?: string }): Promise<OutdoorRoute[]> => {
    if (USE_MOCK) return MOCK_ROUTES[wallId] ?? [];
    const qs = new URLSearchParams();
    if (_params?.style) qs.set('style', _params.style);
    if (_params?.sort) qs.set('sort', _params.sort);
    const q = qs.toString();
    return api.get<OutdoorRoute[]>(`/outdoor/walls/${wallId}/routes${q ? `?${q}` : ''}`);
  },

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

  // ---- User-submitted route ----
  /** Submit a new route for admin review. Backend creates the record with
   *  `status="pending"` + the submitter's id, and attaches it to a system
   *  wall under the region. User-provided coords are stored on the route
   *  itself (not on the wall), so each pending route keeps its own
   *  location for admin review.
   *
   *  BR Track A: field rename `area_id` → `region_id`. Submission entry
   *  point stays at top level; Crag-level entry shift is Track D scope. */
  submitRoute: async (payload: {
    region_id: string;
    style: 'sport' | 'trad' | 'boulder' | 'multi-pitch';
    name: string;
    grade_text: string;
    grade_system: 'yds' | 'vscale';
    lat: number;
    lng: number;
    photo_urls: string[];
  }): Promise<{ id: string; status: string }> => {
    return api.post<{ id: string; status: string }>('/outdoor/routes/submit', payload);
  },

  // ---- Search ----
  search: async (q: string, regionId?: string): Promise<OutdoorRoute[]> => {
    if (USE_MOCK) {
      const lower = q.toLowerCase();
      return allMockRoutes().filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.grade_text.toLowerCase().includes(lower) ||
          (r.crag_name ?? '').toLowerCase().includes(lower) ||
          (r.wall_name ?? '').toLowerCase().includes(lower),
      );
    }
    const qs = new URLSearchParams({ q });
    if (regionId) qs.set('region_id', regionId);
    return api.get<OutdoorRoute[]>(`/outdoor/search?${qs}`);
  },

  // ---- BR Track D Day 7 follow-up — tier-1 Crag overview ----
  //
  // Lightweight per-crag projection (lat/lng + counts + region ref)
  // for the client-side `cluster:true` ShapeSource that replaces the
  // legacy Region-overview + bbox shifting source in explore mode (PLAN §3.2).
  // Load once on explore-mode mount.
  listCragsOverview: async (params?: {
    status?: string;
    min_routes?: number;
    limit?: number;
  }): Promise<CragOverview[]> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.min_routes != null) qs.set('min_routes', String(params.min_routes));
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return api.get<CragOverview[]>(`/outdoor/crags${q ? `?${q}` : ''}`);
  },

  // ---- BR Track D — Crag detail (CragInfoSheet source) ----
  //
  // Replaces per-level cobbled fetches (getCrag + getWalls + community
  // stub). Single round-trip returns Crag + walls[] + community summary.
  getCragDetail: async (cragId: string): Promise<CragDetail> => {
    return api.get<CragDetail>(`/outdoor/crags/${encodeURIComponent(cragId)}`);
  },

  // ---- BR Track D — Cross-level search (replaces region-scoped `search`) ----
  //
  // Returns mixed regions / areas / crags / walls / routes ordered with
  // routes first (most common). Use `getSearchHitMetaLabel` from `hooks.ts`
  // for per-row subtitle.
  searchOutdoor: async (params: SearchOutdoorParams): Promise<SearchResult[]> => {
    const qs = new URLSearchParams({ q: params.q });
    if (params.types?.length) qs.set('types', params.types.join(','));
    if (params.region_id) qs.set('region_id', params.region_id);
    if (params.limit) qs.set('limit', String(params.limit));
    return api.get<SearchResult[]>(`/outdoor/search?${qs}`);
  },

  // ---- BR Track D — Bbox climb-coord cluster source (PLAN §2.1) ----
  //
  // Returns flat per-route pins (no aggregation) inside the bbox.
  // Mapbox `ShapeSource cluster:true` consumes the array directly.
  // FE deduplicates by `wall_id` client-side at zoom ≥15 to preserve the
  // "single Wall pin" invariant from PLAN §2.2.
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

  // ---- BR Track D Day 5e: `getMapPins` REMOVED ----
  //
  // The legacy multi-level pre-aggregated pin source `/outdoor/regions/{id}/pins`
  // is gone. New flow: `listPins` (bbox) drives RoutePinCluster, and Wall pin
  // tap → caller-local `focusOnWall` fetches that wall's routes via `getRoutes`.

  // ════════════════════════════════════════════════════════════════
  //  CA Phase 3 — outdoor_areas single-tree endpoints (BE Phase 2)
  //  These replace the 5-layer Region/Area/Crag/Wall queries.
  //  Plan v8 §Phase 3: route through api.ts ONLY (never inline fetch).
  //  Legacy aliases /v2 are 7-14d bridge — Phase 6 deletes them.
  // ════════════════════════════════════════════════════════════════

  /** Detail + ancestors breadcrumb + location_audit (single fetch). */
  getArea: async (areaId: string): Promise<OutdoorAreaDetail> => {
    return api.get<OutdoorAreaDetail>(`/outdoor/areas/${areaId}`);
  },

  /** Direct children, sorted by subtree_route_count desc (children-first UX). */
  listAreaChildren: async (
    areaId: string,
    opts?: { limit?: number },
  ): Promise<OutdoorAreaListItem[]> => {
    const qs = new URLSearchParams();
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    return api.get<OutdoorAreaListItem[]>(
      `/outdoor/areas/${areaId}/children${suffix}`,
    );
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

  // ---- Legacy 7-14d aliases (Phase 6 deletes these calls) ----

  /** Legacy /outdoor/crags/{old_id} bridge. Wraps detail in deprecation envelope. */
  legacyCragAlias: async (oldId: string): Promise<LegacyAliasResponse> => {
    return api.get<LegacyAliasResponse>(`/outdoor/crags/${oldId}/v2`);
  },

  /** Legacy /outdoor/regions/{old_id} bridge. */
  legacyRegionAlias: async (oldId: string): Promise<LegacyAliasResponse> => {
    return api.get<LegacyAliasResponse>(`/outdoor/regions/${oldId}/v2`);
  },

  /** Legacy /outdoor/walls/{old_id} bridge. */
  legacyWallAlias: async (oldId: string): Promise<LegacyAliasResponse> => {
    return api.get<LegacyAliasResponse>(`/outdoor/walls/${oldId}/v2`);
  },
};
