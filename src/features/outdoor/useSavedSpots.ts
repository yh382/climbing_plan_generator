// src/features/outdoor/useSavedSpots.ts
// Polymorphic saved-spots hook (PLAN §11).
//
// Wraps `savedSpotsApi.list()` so callers get a hydrated SavedSpot[]
// without each component running its own fetch. Intentionally not a
// zustand store — read-mostly with a single consumer (GymsSavedSpotsRow).
// Writes from the unified OutdoorAreaInfoSheet trigger `refresh()`.
//
// CA Phase 6.1 cleaned up the prior dual-source dance: region bookmarks
// used to flow through a separate `useFavoriteRegionsStore` + the
// `/regions/{id}/favorite` endpoint. That store + endpoint are gone; all
// target types (region / area / crag / route / outdoor_area) now flow
// through this single hook.

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
