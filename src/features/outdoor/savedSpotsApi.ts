// src/features/outdoor/savedSpotsApi.ts
// BR Track D D-4 — polymorphic Saved Spots wrapper (Region/Area/Crag/Route).
//
// Wraps the polymorphic outdoor_list_items table shipped in Track C.
// BE-side a per-user `__saved_spots__` sentinel list is auto-provisioned
// on first save; FE never sees that detail.
//
// Replaces FE-side legacy:
//   - outdoorApi.favoriteRegion(id) / unfavoriteRegion(id) / listFavoriteRegions()
//   - useFavoriteRegionsStore
// Legacy region endpoints stay live during compat (BR-Track-D-FU drops them).

import { api } from "../../lib/apiClient";
import type {
  SavedSpot,
  SavedSpotsResponse,
  SavedSpotTargetType,
} from "./types";

export const savedSpotsApi = {
  list: (): Promise<SavedSpotsResponse> =>
    api.get<SavedSpotsResponse>("/outdoor/saved-spots"),

  save: (target_type: SavedSpotTargetType, target_id: string): Promise<SavedSpot> =>
    api.post<SavedSpot>("/outdoor/saved-spots", { target_type, target_id }),

  unsave: (target_type: SavedSpotTargetType, target_id: string): Promise<void> =>
    api.del<void>(
      `/outdoor/saved-spots/${target_type}/${encodeURIComponent(target_id)}`,
    ),
};
