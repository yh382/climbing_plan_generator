// src/features/orgs/api.ts
import { api } from "../../lib/apiClient";
import type { AffiliationsResponse } from "./types";

export const orgsApi = {
  /** GET /users/{userId}/affiliations — a user's active gym affiliations
   *  (verified staff memberships) for profile badges + setter resolution. */
  getAffiliations: (userId: string) =>
    api.get<AffiliationsResponse>(`/users/${userId}/affiliations`),
};
