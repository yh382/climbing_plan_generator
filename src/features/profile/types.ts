// src/features/profile/types.ts
//
// Window D1 — types for /users/{userId}/ascents (profile follower /
// following → user ascents page).

import type { AggregatedClimbItem } from "../journal/loglist/types";

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

/** Wire-shape of /users/{user_id}/ascents response.
 *
 *  ``ascents`` matches the backend Pydantic ``AggregatedClimbItem`` —
 *  snake_case keys, mirroring the FE ``AggregatedClimbItem`` after a
 *  per-field rename in the page-level normaliser.
 */
export type UserAscentsApiItem = {
  route_key: string;
  name: string;
  grade: string;
  wall_type: string;
  attempts_total: number;
  send_count: number;
  style: AggregatedClimbItem["style"];
  feel: AggregatedClimbItem["feel"] | null;
  note: string | null;
  media: AggregatedClimbItem["media"] | null;
  outdoor_route_id: string | null;
  gym_route_id: string | null;
  latest_id: string;
  raw_ids: string[];
  /** ISO 8601 (UTC). */
  created_at: string;
};

export type UserAscentsResponse = {
  ascents: UserAscentsApiItem[];
  next_cursor: string | null;
};
