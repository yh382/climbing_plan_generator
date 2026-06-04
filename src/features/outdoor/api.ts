// src/features/outdoor/api.ts
// API layer for outdoor module — 5-level hierarchy (post BR Track A rename):
//   Region → Area → Crag → Wall → Route
// Mock mode uses external mockData.ts; toggle USE_MOCK to false when backend is ready

import { api } from '../../lib/apiClient';
import type {
  Region, Area, Crag, Wall, OutdoorRoute,
  RouteRating, RouteAscent, MapPin,
} from './types';
import {
  MOCK_REGIONS, MOCK_AREAS, MOCK_CRAGS, MOCK_WALLS, MOCK_ROUTES,
} from './mockData';

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

  // ---- Map pins (all levels for a region) ----
  getMapPins: async (regionId: string): Promise<MapPin[]> => {
    if (USE_MOCK) {
      const areas = MOCK_AREAS[regionId] ?? [];
      const areaPins: MapPin[] = areas
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({ id: a.id, name: a.name, lat: a.lat!, lng: a.lng!, route_count: a.route_count ?? 0, level: 'area' as const }));

      const cragPins: MapPin[] = areas.flatMap((a) =>
        (MOCK_CRAGS[a.id] ?? [])
          .filter((c) => c.lat != null && c.lng != null)
          .map((c) => ({ id: c.id, name: c.name, lat: c.lat!, lng: c.lng!, route_count: c.route_count ?? 0, level: 'crag' as const })),
      );

      const wallPins: MapPin[] = areas.flatMap((a) =>
        (MOCK_CRAGS[a.id] ?? []).flatMap((c) =>
          (MOCK_WALLS[c.id] ?? [])
            .filter((w) => w.lat != null && w.lng != null)
            .map((w) => ({ id: w.id, name: w.name, lat: w.lat!, lng: w.lng!, route_count: w.route_count ?? 0, level: 'wall' as const })),
        ),
      );

      // Route-level pins — one per route. Since mock data has no per-route
      // GPS, we synthesize positions by fanning routes horizontally around
      // the parent wall's coord. ~11m spacing (0.0001° longitude at 40°N)
      // so routes are visually separable at zoom ≥15 without drifting too
      // far from the physical wall location. Name = grade_text so the
      // centered pin label reads "5.12a" / "V5".
      const ROUTE_OFFSET_STEP = 0.0001;
      const routePins: MapPin[] = areas.flatMap((a) =>
        (MOCK_CRAGS[a.id] ?? []).flatMap((c) =>
          (MOCK_WALLS[c.id] ?? []).flatMap((w) => {
            if (w.lat == null || w.lng == null) return [];
            const routes = MOCK_ROUTES[w.id] ?? [];
            const n = routes.length;
            // Center the fan on the wall: offsets symmetric around 0.
            const startOffset = -((n - 1) / 2) * ROUTE_OFFSET_STEP;
            return routes.map((r, i) => ({
              id: r.id,
              name: r.grade_text,
              lat: w.lat!,
              lng: w.lng! + startOffset + i * ROUTE_OFFSET_STEP,
              route_count: 1,
              level: 'route' as const,
              parent_id: w.id,
            }));
          }),
        ),
      );

      return [...areaPins, ...cragPins, ...wallPins, ...routePins];
    }
    return api.get<MapPin[]>(`/outdoor/regions/${regionId}/pins`);
  },
};
