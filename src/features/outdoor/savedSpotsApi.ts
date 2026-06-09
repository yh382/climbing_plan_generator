// src/features/outdoor/savedSpotsApi.ts
// Polymorphic Saved Spots wrapper. Target types: region / area / crag /
// route / outdoor_area (Phase 5.2 widened the Literal).
//
// Wraps the polymorphic outdoor_list_items table. BE-side a per-user
// `__saved_spots__` sentinel list is auto-provisioned on first save;
// FE never sees that detail.
//
// Replaced (CA Phase 6.1) the legacy region-only favorite store +
// `/regions/{id}/favorite` endpoints. Region bookmarks now flow through
// this same wrapper with target_type='region'.

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
