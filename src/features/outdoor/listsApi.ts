// src/features/outdoor/listsApi.ts
// User-created outdoor route lists (Window U).

import { api } from "../../lib/apiClient";
import type {
  OutdoorList,
  OutdoorListDetail,
  OutdoorListItem,
  RouteContainment,
  SavedSpotTargetType,
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

/** BR Track D — polymorphic add. Either legacy `route_id` or new
 *  `(target_type, target_id)` shape; never both (BE XOR-validates).
 *  Existing route-only callers keep working through the `addItem(listId, routeId, note)`
 *  overload below; use `addTarget()` for Region/Area/Crag saves. */
export type AddItemInput =
  | { route_id: string; note?: string }
  | { target_type: SavedSpotTargetType; target_id: string; note?: string };

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

  /** Legacy route-only add. Continues to work via BE XOR validator —
   *  payload `{route_id, note}` is coerced into `target_type='route'`.
   *  Track D Day 6 dead-code sweep will deprecate in favor of `addTarget`. */
  addItem: (listId: string, routeId: string, note?: string): Promise<OutdoorListItem> =>
    api.post<OutdoorListItem>(
      `/outdoor/lists/${encodeURIComponent(listId)}/items`,
      { route_id: routeId, note }
    ),

  /** BR Track D — polymorphic add. Use for Region/Area/Crag saves. */
  addTarget: (
    listId: string,
    target_type: SavedSpotTargetType,
    target_id: string,
    note?: string,
  ): Promise<OutdoorListItem> =>
    api.post<OutdoorListItem>(
      `/outdoor/lists/${encodeURIComponent(listId)}/items`,
      { target_type, target_id, note }
    ),

  removeItem: (listId: string, itemId: string): Promise<void> =>
    api.del<void>(
      `/outdoor/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`
    ),
};
