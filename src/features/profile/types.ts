// src/features/profile/types.ts
//
// Window D1 — types for /users/{userId}/ascents (profile follower /
// following → user ascents page).
//
// Window BA — wire-format types are now generated from
// docs/openapi.json via openapi-typescript and re-exported here. The FE
// camelCase domain type (`AggregatedClimbItem` in
// `features/journal/loglist/types.ts`) is intentionally distinct: the
// page-level normaliser maps wire → domain in `useUserAscents.mapItem`.

import type { components } from "../../types/api";

export type AscentsLocationFilter = "all" | "outdoor" | "gym";
export type AscentsWallFilter = "all" | "boulder" | "rope";

export type AscentsFilter = {
  location_type?: AscentsLocationFilter;
  wall_type?: AscentsWallFilter;
  /** Inclusive lower bound on log date. ISO YYYY-MM-DD. */
  since?: string;
  /** Cursor (`next_cursor` from previous response). */
  cursor?: string;
  /** Page size, 1-100. Default 20. */
  limit?: number;
};

/** Wire-shape of one item in /users/{user_id}/ascents response.
 *  Generated from the BE Pydantic ``AggregatedClimbItem``. */
export type UserAscentsApiItem = components["schemas"]["AggregatedClimbItem"];

/** Wire-shape of /users/{user_id}/ascents response. */
export type UserAscentsResponse = components["schemas"]["UserAscentsResponse"];
