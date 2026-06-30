// src/features/orgs/hooks.ts
import { useEffect, useState } from "react";
import { orgsApi } from "./api";
import type { Affiliation } from "./types";

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
