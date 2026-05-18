import { useEffect } from 'react';

import useFavoriteAreasStore from '../../store/useFavoriteAreasStore';

/**
 * Standalone Area favorite toggle. Thin wrapper over the shared
 * `useFavoriteAreasStore` zustand state so multiple components
 * (AreaInfoSheet writer, GymsSavedSpotsRow reader) stay in sync without
 * each one running its own /areas/favorites fetch.
 *
 * Toggle signature accepts the full Area so the saved-spots strip can
 * render avatar + name immediately when a user favorites a new area
 * inside the info sheet.
 */
export function useAreaFavoriteToggle() {
  const isFavorited = useFavoriteAreasStore((s) => s.isFavorited);
  const toggle = useFavoriteAreasStore((s) => s.toggle);
  const loaded = useFavoriteAreasStore((s) => s.loaded);
  const hydrate = useFavoriteAreasStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { isFavorited, toggle, loaded };
}
