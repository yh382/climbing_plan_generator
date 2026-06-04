// src/features/outdoor/betaApi.ts
// Client for Window AJ1 beta endpoints. Matches the Pydantic schemas in
// climbing_plan_backend/schemas/beta.py — keep the shapes in sync when the
// backend evolves.

import { api } from '../../lib/apiClient';

export type BetaAuthor = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type BetaRouteRef = {
  id: string;
  name: string;
  grade_text: string;
  /** One of 'sport' | 'trad' | 'boulder' | 'multi-pitch' (mirror of
   *  OutdoorRoute.style). Client can discriminate rope vs boulder with
   *  `style === 'boulder'`. */
  style: string;
};

export type BetaOut = {
  id: string;
  route: BetaRouteRef;
  author: BetaAuthor;
  media_url: string;
  thumbnail_url: string | null;
  description: string | null;
  likes_count: number;
  liked_by_me: boolean;
  created_at: string;
};

export type BetaCreateInput = {
  media_url: string;
  thumbnail_url?: string | null;
  description?: string | null;
};

export const betaApi = {
  createForRoute(routeId: string, body: BetaCreateInput) {
    return api.post<BetaOut>(`/outdoor/routes/${routeId}/beta`, body);
  },
  listForRoute(routeId: string, params: { limit?: number; offset?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<BetaOut[]>(`/outdoor/routes/${routeId}/beta${suffix}`);
  },
  /** BR Track A: endpoint moved from /outdoor/areas/{area_id}/beta to
   *  /outdoor/regions/{region_id}/beta. Param name + method name kept as
   *  `…ForArea`/`areaId` for caller minimum-diff — the value passed is
   *  the top-level entity id (was Area, now Region). Track D will rename
   *  the method + caller chain when the community surface is rewritten. */
  listForArea(areaId: string, params: { limit?: number; offset?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set('limit', String(params.limit));
    if (params.offset != null) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<BetaOut[]>(`/outdoor/regions/${areaId}/beta${suffix}`);
  },
  deleteOwn(betaId: string) {
    return api.del(`/outdoor/beta/${betaId}`);
  },
  like(betaId: string) {
    return api.post(`/outdoor/beta/${betaId}/like`);
  },
  unlike(betaId: string) {
    return api.del(`/outdoor/beta/${betaId}/like`);
  },
};
