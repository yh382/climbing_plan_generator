// src/features/outdoor/api.ts
// API layer for outdoor module — 5-level hierarchy
// Mock mode uses external mockData.ts; toggle USE_MOCK to false when backend is ready

import { api } from '../../lib/apiClient';
import type {
  Area, Crag, Sector, Wall, OutdoorRoute,
  RouteRating, RouteAscent, MapPin,
} from './types';
import {
  MOCK_AREAS, MOCK_CRAGS, MOCK_SECTORS, MOCK_WALLS, MOCK_ROUTES,
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
  // ---- Areas ----
  listAreas: async (_params?: { country?: string; status?: string }): Promise<Area[]> => {
    if (USE_MOCK) return MOCK_AREAS;
    const qs = new URLSearchParams();
    if (_params?.country) qs.set('country', _params.country);
    if (_params?.status) qs.set('status', _params.status);
    // BE returns PaginatedAreas { items, total, page, limit } — unwrap
    // here so the public contract stays Area[]. Pagination not yet
    // surfaced. BL post-ship we have 700+ areas so 2000 cap matches the
    // BE's new upper bound; beyond that we'd want viewport bbox filter.
    qs.set('limit', '2000');
    const page = await api.get<{ items: Area[]; total: number }>(`/areas?${qs}`);
    return page.items ?? [];
  },

  getArea: async (id: string): Promise<Area | null> => {
    if (USE_MOCK) return MOCK_AREAS.find((a) => a.id === id) ?? null;
    return api.get<Area>(`/areas/${id}`);
  },

  nearbyAreas: async (lat: number, lng: number, radiusKm: number): Promise<Area[]> => {
    if (USE_MOCK) return MOCK_AREAS;
    return api.get<Area[]>(`/areas/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`);
  },

  favoriteArea: async (id: string) => {
    if (USE_MOCK) return { ok: true };
    return api.post<{ ok: boolean }>(`/areas/${id}/favorite`);
  },

  unfavoriteArea: async (id: string) => {
    if (USE_MOCK) return { ok: true };
    return api.del<{ ok: boolean }>(`/areas/${id}/favorite`);
  },

  listFavoriteAreas: async (): Promise<Area[]> => {
    if (USE_MOCK) return [];
    return api.get<Area[]>(`/areas/favorites`);
  },

  // ---- Hierarchy ----
  getCrags: async (areaId: string): Promise<Crag[]> => {
    if (USE_MOCK) return MOCK_CRAGS[areaId] ?? [];
    return api.get<Crag[]>(`/outdoor/areas/${areaId}/crags`);
  },

  getSectors: async (cragId: string): Promise<Sector[]> => {
    if (USE_MOCK) return MOCK_SECTORS[cragId] ?? [];
    return api.get<Sector[]>(`/outdoor/crags/${cragId}/sectors`);
  },

  getWalls: async (sectorId: string): Promise<Wall[]> => {
    if (USE_MOCK) return MOCK_WALLS[sectorId] ?? [];
    return api.get<Wall[]>(`/outdoor/sectors/${sectorId}/walls`);
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
   *  wall under the area. User-provided coords are stored on the route
   *  itself (not on the wall), so each pending route keeps its own
   *  location for admin review. */
  submitRoute: async (payload: {
    area_id: string;
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
  search: async (q: string, areaId?: string): Promise<OutdoorRoute[]> => {
    if (USE_MOCK) {
      const lower = q.toLowerCase();
      return allMockRoutes().filter(
        (r) =>
          r.name.toLowerCase().includes(lower) ||
          r.grade_text.toLowerCase().includes(lower) ||
          (r.sector_name ?? '').toLowerCase().includes(lower) ||
          (r.wall_name ?? '').toLowerCase().includes(lower),
      );
    }
    const qs = new URLSearchParams({ q });
    if (areaId) qs.set('area_id', areaId);
    return api.get<OutdoorRoute[]>(`/outdoor/search?${qs}`);
  },

  // ---- Map pins (all levels for an area) ----
  getMapPins: async (areaId: string): Promise<MapPin[]> => {
    if (USE_MOCK) {
      const crags = MOCK_CRAGS[areaId] ?? [];
      const cragPins: MapPin[] = crags
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({ id: c.id, name: c.name, lat: c.lat!, lng: c.lng!, route_count: c.route_count ?? 0, level: 'crag' as const }));

      const sectorPins: MapPin[] = crags.flatMap((c) =>
        (MOCK_SECTORS[c.id] ?? [])
          .filter((s) => s.lat != null && s.lng != null)
          .map((s) => ({ id: s.id, name: s.name, lat: s.lat!, lng: s.lng!, route_count: s.route_count ?? 0, level: 'sector' as const })),
      );

      const wallPins: MapPin[] = crags.flatMap((c) =>
        (MOCK_SECTORS[c.id] ?? []).flatMap((s) =>
          (MOCK_WALLS[s.id] ?? [])
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
      const routePins: MapPin[] = crags.flatMap((c) =>
        (MOCK_SECTORS[c.id] ?? []).flatMap((s) =>
          (MOCK_WALLS[s.id] ?? []).flatMap((w) => {
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

      return [...cragPins, ...sectorPins, ...wallPins, ...routePins];
    }
    return api.get<MapPin[]>(`/outdoor/areas/${areaId}/pins`);
  },
};
