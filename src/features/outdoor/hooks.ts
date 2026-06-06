import { useEffect } from 'react';

import useFavoriteRegionsStore from '../../store/useFavoriteRegionsStore';
import type { SearchResult } from './types';

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

/**
 * BR Track D — derive a one-line subtitle for a cross-level search result row.
 *
 * Centralizes the per-`type` formatting so the search results UI stays
 * dumb (just render `${name}\n${getSearchHitMetaLabel(hit)}`). Mirrors
 * BE field nullability — keeps zero-fallback consistent across icons.
 */
export function getSearchHitMetaLabel(hit: SearchResult): string {
  switch (hit.type) {
    case 'route':
      return [hit.grade_text, hit.crag_name].filter(Boolean).join(' · ');
    case 'wall':
      return [hit.crag_name, hit.route_count != null ? `${hit.route_count} routes` : null]
        .filter(Boolean).join(' · ');
    case 'crag':
      return [hit.area_name, hit.route_count != null ? `${hit.route_count} routes` : null]
        .filter(Boolean).join(' · ');
    case 'area':
      return [hit.region_name, hit.route_count != null ? `${hit.route_count} routes` : null]
        .filter(Boolean).join(' · ');
    case 'region':
      return hit.route_count != null ? `${hit.route_count} routes` : '';
  }
}
