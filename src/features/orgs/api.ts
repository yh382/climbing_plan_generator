// src/features/orgs/api.ts
import { api } from "../../lib/apiClient";
import type { AffiliationsResponse, MyInvitesResponse } from "./types";

export const orgsApi = {
  /** GET /users/{userId}/affiliations — a user's active gym affiliations
   *  (verified staff memberships) for profile badges + setter resolution. */
  getAffiliations: (userId: string) =>
    api.get<AffiliationsResponse>(`/users/${userId}/affiliations`),

  /** GET /orgs/invites/me — pending invites for the current user (P2-B). */
  getMyInvites: () => api.get<MyInvitesResponse>("/orgs/invites/me"),

  /** POST /orgs/invites/{id}/accept — accept → membership active. */
  acceptInvite: (membershipId: string) =>
    api.post<{ id: string; status: string }>(`/orgs/invites/${membershipId}/accept`),

  /** POST /orgs/invites/{id}/decline — server-authoritative decline. */
  declineInvite: (membershipId: string) =>
    api.post<{ ok: boolean }>(`/orgs/invites/${membershipId}/decline`),
};
