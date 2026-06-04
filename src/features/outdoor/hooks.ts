import { useEffect } from 'react';

import useFavoriteRegionsStore from '../../store/useFavoriteRegionsStore';

/**
 * Standalone Region favorite toggle. Thin wrapper over the shared
 * `useFavoriteRegionsStore` zustand state so multiple components
 * (AreaInfoSheet writer, GymsSavedSpotsRow reader) stay in sync without
 * each one running its own /regions/favorites fetch.
 *
 * Toggle signature accepts the full Region so the saved-spots strip can
 * render avatar + name immediately when a user favorites a new region
 * inside the info sheet.
 *
 * Function name kept as `useAreaFavoriteToggle` for caller minimum-diff;
 * Track D will rename.
 */
export function useAreaFavoriteToggle() {
  const isFavorited = useFavoriteRegionsStore((s) => s.isFavorited);
  const toggle = useFavoriteRegionsStore((s) => s.toggle);
  const loaded = useFavoriteRegionsStore((s) => s.loaded);
  const hydrate = useFavoriteRegionsStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { isFavorited, toggle, loaded };
}
