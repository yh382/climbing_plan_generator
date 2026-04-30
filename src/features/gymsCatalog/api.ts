// Indoor gym catalog API client (Window AR)
// Mock-first: when EXPO_PUBLIC_MOCK_GYM_CATALOG=1 the dev build serves
// fixture data without touching the backend, so the FE can iterate
// before any indoor gym is seeded into prod Neon.

import { api } from '../../lib/apiClient';
import {
  mockGym,
  mockGymRoutes,
  mockWallSections,
  MOCK_GYM_ID,
} from './mockData';
import type {
  Gym,
  GymRoute,
  GymRouteCreatePayload,
  GymRouteListParams,
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
};
