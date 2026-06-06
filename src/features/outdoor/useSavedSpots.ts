// src/features/outdoor/useSavedSpots.ts
// BR Track D Day 6 — polymorphic saved-spots hook (PLAN §11).
//
// Wraps `savedSpotsApi.list()` (Day 0 BE) so callers get a hydrated
// SavedSpot[] without each component running its own fetch. The hook
// is intentionally not a zustand store — there's only one consumer
// today (GymsSavedSpotsRow) and the data is read-mostly. Future writes
// from CragInfoSheet / AreaInfoSheet trigger a manual `refresh()`.
//
// Note (Day 6 transition): Region favorites today still flow through
// the legacy `/regions/{id}/favorite` endpoint via `useFavoriteRegionsStore`.
// Day 0 BE seeded the saved-spots table from `user_favorite_regions` once,
// but new region toggles don't dual-write. Callers should union
// `useFavoriteRegionsStore.regions` (Region source) with `useSavedSpots`
// filtered to NON-region target_types until BR-Track-D-FU-cleanup drops
// the legacy region favorites endpoint.

import { useCallback, useEffect, useState } from "react";

import { savedSpotsApi } from "./savedSpotsApi";
import type { SavedSpot } from "./types";

export interface UseSavedSpotsResult {
  items: SavedSpot[];
  loading: boolean;
  error: string | null;
  /** Manually re-pull the list. Use after CragInfoSheet/AreaInfoSheet
   *  save/unsave so the strip updates without a full screen remount. */
  refresh: () => Promise<void>;
}

export function useSavedSpots(): UseSavedSpotsResult {
  const [items, setItems] = useState<SavedSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await savedSpotsApi.list();
      setItems(resp.items ?? []);
    } catch (err) {
      // Anonymous viewers get 401 — treat as empty, not error
      const message = err instanceof Error ? err.message : "Failed to load saved spots";
      // 401 is the expected anonymous case; treat as empty silently.
      if (message.toLowerCase().includes("unauthor") || message.includes("401")) {
        setItems([]);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
