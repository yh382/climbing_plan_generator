// Org affiliations (W9 backend) — a user's verified gym memberships.
// The membership IS the verification (gym invited + user accepted), so an
// active affiliation renders as a "✓ Setter @ Gym" badge on the profile and
// resolves a route's setter link to the person. See docs decision D11.

export interface Affiliation {
  org_id: string;
  org_name: string;
  org_handle?: string | null;
  org_logo_url?: string | null;
  /** owner | editor | staff | member */
  role: string;
  is_setter: boolean;
  is_head_setter: boolean;
  gym: { id: string; name: string } | null;
}

export interface AffiliationsResponse {
  items: Affiliation[];
}
