// src/features/outdoor/listsApi.ts
// User-created outdoor route lists (Window U).

import { api } from "../../lib/apiClient";
import type {
  OutdoorList,
  OutdoorListDetail,
  OutdoorListItem,
  RouteContainment,
} from "./types";

export type CreateListInput = {
  name: string;
  description?: string;
};

export type UpdateListInput = {
  name?: string;
  description?: string;
  cover_route_id?: string | null;
};

export const outdoorListsApi = {
  listMine: (): Promise<OutdoorList[]> => api.get<OutdoorList[]>("/outdoor/lists/me"),

  listsContainingRoute: (routeId: string): Promise<RouteContainment[]> =>
    api.get<RouteContainment[]>(`/outdoor/lists/me/contains-route/${encodeURIComponent(routeId)}`),

  listByUser: (userId: string): Promise<OutdoorList[]> =>
    api.get<OutdoorList[]>(`/outdoor/lists/user/${encodeURIComponent(userId)}`),

  create: (body: CreateListInput): Promise<OutdoorList> =>
    api.post<OutdoorList>("/outdoor/lists", body),

  getDetail: (listId: string): Promise<OutdoorListDetail> =>
    api.get<OutdoorListDetail>(`/outdoor/lists/${encodeURIComponent(listId)}`),

  update: (listId: string, body: UpdateListInput): Promise<OutdoorList> =>
    api.patch<OutdoorList>(`/outdoor/lists/${encodeURIComponent(listId)}`, body),

  delete: (listId: string): Promise<void> =>
    api.del<void>(`/outdoor/lists/${encodeURIComponent(listId)}`),

  addItem: (listId: string, routeId: string, note?: string): Promise<OutdoorListItem> =>
    api.post<OutdoorListItem>(
      `/outdoor/lists/${encodeURIComponent(listId)}/items`,
      { route_id: routeId, note }
    ),

  removeItem: (listId: string, itemId: string): Promise<void> =>
    api.del<void>(
      `/outdoor/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`
    ),
};
