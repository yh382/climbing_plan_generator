// src/features/outdoor/api.ts
// API layer for outdoor module — 5-level hierarchy (post BR Track A rename):
//   Region → Area → Crag → Wall → Route
// Mock mode uses external mockData.ts; toggle USE_MOCK to false when backend is ready

import { api } from '../../lib/apiClient';
import type {
  Region, Area, Crag, Wall, OutdoorRoute,
  RouteRating, RouteAscent,
  RoutePinsResponse, CragDetail, SearchResult,
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

  favoriteRegion: async (id: string) => {
    if (USE_MOCK) return { ok: true };
    return api.post<{ ok: boolean }>(`/regions/${id}/favorite`);
  },

  unfavoriteRegion: async (id: string) => {
    if (USE_MOCK) return { ok: true };
    return api.del<{ ok: boolean }>(`/regions/${id}/favorite`);
  },

  listFavoriteRegions: async (): Promise<Region[]> => {
    if (USE_MOCK) return [];
    return api.get<Region[]>(`/regions/favorites`);
  },

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
};
