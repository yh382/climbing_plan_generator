// src/features/orgs/hooks.ts
import { useCallback, useEffect, useState } from "react";
import { orgsApi } from "./api";
import type { Affiliation, OrgInvite } from "./types";

/** Fetch a user's active gym affiliations (verified staff memberships). */
export function useAffiliations(userId: string | undefined | null) {
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setAffiliations([]);
      return;
    }
    let alive = true;
    setLoading(true);
    orgsApi
      .getAffiliations(userId)
      .then((r) => {
        if (alive) setAffiliations(r.items ?? []);
      })
      .catch(() => {
        if (alive) setAffiliations([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  return { affiliations, loading };
}

/** Pending org invites for the current user, with a refetch for after
 *  accept/decline. */
export function useMyInvites() {
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    return orgsApi
      .getMyInvites()
      .then((r) => setInvites(r.items ?? []))
      .catch(() => setInvites([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let alive = true;
    orgsApi
      .getMyInvites()
      .then((r) => {
        if (alive) setInvites(r.items ?? []);
      })
      .catch(() => {
        if (alive) setInvites([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { invites, loading, refetch };
}
