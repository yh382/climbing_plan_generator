// Indoor gym catalog API client (Window AR; D1-FU flipped to BE-first).
// Default path hits the real backend — BE seed migration
// `d1fu_seed_demo_gym_catalog` ships the demo gym + 60 routes.
// Mock fallback is retained as a dev escape hatch:
// `EXPO_PUBLIC_MOCK_GYM_CATALOG=1` forces local fixtures
// (src/features/gymsCatalog/mockData.ts).

import { api } from '../../lib/apiClient';
import type { BetaCreateInput, BetaOut } from '../outdoor/betaApi';
import {
  mockGym,
  mockGymAscents,
  mockGymBetas,
  mockGymRatings,
  mockGymRoutes,
  mockWallSections,
  MOCK_GYM_ID,
} from './mockData';
import type {
  Gym,
  GymRoute,
  GymRouteAscent,
  GymRouteCreatePayload,
  GymRouteListParams,
  GymRouteRating,
  GymRouteRatingPayload,
  WallSection,
} from './types';

export const USE_MOCK_GYM_CATALOG =
  process.env.EXPO_PUBLIC_MOCK_GYM_CATALOG === '1';

function applyFilters(
  routes: GymRoute[],
  params?: GymRouteListParams,
): GymRoute[] {
  const status = params?.status ?? 'active';
  return routes.filter((r) => {
    if (status !== 'all' && r.status !== status) return false;
    if (params?.color && r.color !== params.color) return false;
    if (params?.setter && r.setter_name !== params.setter) return false;
    if (params?.style && r.style !== params.style) return false;
    return true;
  });
}

function buildQuery(params?: GymRouteListParams): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.color) sp.set('color', params.color);
  if (params.setter) sp.set('setter', params.setter);
  if (params.style) sp.set('style', params.style);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const gymsCatalogApi = {
  isMock: USE_MOCK_GYM_CATALOG,
  mockGymId: MOCK_GYM_ID,

  async getGym(gymId: string): Promise<Gym> {
    if (USE_MOCK_GYM_CATALOG) return mockGym;
    return api.get<Gym>(`/gym/${gymId}`);
  },

  async listWallSections(gymId: string): Promise<WallSection[]> {
    if (USE_MOCK_GYM_CATALOG) return mockWallSections;
    return api.get<WallSection[]>(`/gym/${gymId}/wall-sections`);
  },

  async listRoutesInWallSection(
    sectionId: string,
    params?: GymRouteListParams,
  ): Promise<GymRoute[]> {
    if (USE_MOCK_GYM_CATALOG) {
      return applyFilters(
        mockGymRoutes.filter((r) => r.wall_section_id === sectionId),
        params,
      );
    }
    return api.get<GymRoute[]>(
      `/gym/wall-sections/${sectionId}/routes${buildQuery(params)}`,
    );
  },

  async listRoutesInGym(
    gymId: string,
    params?: GymRouteListParams,
  ): Promise<GymRoute[]> {
    if (USE_MOCK_GYM_CATALOG) {
      const sectionIds = new Set(
        mockWallSections.map((s) => s.id),
      );
      return applyFilters(
        mockGymRoutes.filter((r) => sectionIds.has(r.wall_section_id)),
        params,
      );
    }
    return api.get<GymRoute[]>(`/gym/${gymId}/routes${buildQuery(params)}`);
  },

  async getRoute(routeId: string): Promise<GymRoute> {
    if (USE_MOCK_GYM_CATALOG) {
      const r = mockGymRoutes.find((x) => x.id === routeId);
      if (!r) throw new Error('Route not found');
      return r;
    }
    return api.get<GymRoute>(`/gym/routes/${routeId}`);
  },

  async submitRoute(
    sectionId: string,
    payload: GymRouteCreatePayload,
  ): Promise<GymRoute> {
    if (USE_MOCK_GYM_CATALOG) {
      throw new Error('submitRoute not supported in mock mode');
    }
    return api.post<GymRoute>(
      `/gym/wall-sections/${sectionId}/routes`,
      payload,
    );
  },

  async archiveRoute(routeId: string): Promise<void> {
    if (USE_MOCK_GYM_CATALOG) return;
    await api.post(`/gym/routes/${routeId}/archive`);
  },

  async unarchiveRoute(routeId: string): Promise<void> {
    if (USE_MOCK_GYM_CATALOG) return;
    await api.post(`/gym/routes/${routeId}/unarchive`);
  },

  // ── AS: ascents / ratings / beta ─────────────────────────────────

  async getAscents(routeId: string): Promise<GymRouteAscent[]> {
    if (USE_MOCK_GYM_CATALOG) return mockGymAscents(routeId);
    return api.get<GymRouteAscent[]>(`/gym/routes/${routeId}/ascents`);
  },

  async getRatings(routeId: string): Promise<GymRouteRating[]> {
    if (USE_MOCK_GYM_CATALOG) return mockGymRatings(routeId);
    return api.get<GymRouteRating[]>(`/gym/routes/${routeId}/ratings`);
  },

  async rateRoute(
    routeId: string,
    payload: GymRouteRatingPayload,
  ): Promise<GymRouteRating> {
    if (USE_MOCK_GYM_CATALOG) {
      // Mock: pretend the rating round-tripped. UI doesn't reread the list.
      return {
        id: `mock-rating-${Date.now()}`,
        route_id: routeId,
        user_id: 'mock-user',
        stars: payload.stars,
        comment: payload.comment ?? null,
        created_at: new Date().toISOString(),
        username: 'you',
      };
    }
    return api.post<GymRouteRating>(`/gym/routes/${routeId}/rate`, payload);
  },

  async listBeta(
    routeId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<BetaOut[]> {
    if (USE_MOCK_GYM_CATALOG) return mockGymBetas(routeId, params);
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<BetaOut[]>(`/gym/routes/${routeId}/beta${suffix}`);
  },

  async createBeta(routeId: string, body: BetaCreateInput): Promise<BetaOut> {
    if (USE_MOCK_GYM_CATALOG) {
      throw new Error('createBeta not supported in mock mode');
    }
    return api.post<BetaOut>(`/gym/routes/${routeId}/beta`, body);
  },
};
