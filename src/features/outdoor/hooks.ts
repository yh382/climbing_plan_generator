import { useCallback, useEffect, useState } from 'react';

import { outdoorApi } from './api';

/**
 * Standalone Area favorite toggle — mirrors useGymFavoriteToggle in
 * src/features/gyms/hooks.ts. Loads the set of favorited area_ids once
 * on mount, then toggles optimistically with rollback on error.
 */
export function useAreaFavoriteToggle() {
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    outdoorApi
      .listFavoriteAreas()
      .then((areas) => {
        setFavSet(new Set(areas.map((a) => a.id)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const isFavorited = useCallback(
    (areaId: string) => favSet.has(areaId),
    [favSet],
  );

  const toggle = useCallback(
    async (areaId: string) => {
      const wasFav = favSet.has(areaId);
      setFavSet((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(areaId);
        else next.add(areaId);
        return next;
      });
      try {
        if (wasFav) await outdoorApi.unfavoriteArea(areaId);
        else await outdoorApi.favoriteArea(areaId);
      } catch {
        setFavSet((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(areaId);
          else next.delete(areaId);
          return next;
        });
      }
    },
    [favSet],
  );

  return { isFavorited, toggle, loaded };
}
