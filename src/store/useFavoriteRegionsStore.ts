// src/store/useFavoriteRegionsStore.ts
// Renamed from useFavoriteAreasStore in BR Track A — the top-level outdoor
// entity is now Region (was Area).
//
// Single source of truth for the user's favorited outdoor regions.
// Replaces the prior per-component `useRegionFavoriteToggle` hook so
// RegionInfoSheet/AreaInfoSheet (writer) and GymsSavedSpotsRow (reader)
// stay in sync — toggling a favorite in the sheet immediately updates
// the saved spots strip without re-fetching on focus.
//
// Optimistic toggle: state changes first, BE call follows. On error
// the change is rolled back so the UI doesn't lie about persistence.
import { create } from 'zustand';

import { outdoorApi } from '../features/outdoor/api';
import type { Region } from '../features/outdoor/types';

type State = {
  regions: Region[];
  loaded: boolean;
  loading: boolean;
  /** Pull the full favorite list from BE. Idempotent — safe to call on
   *  every mount; subsequent callers no-op until reset(). */
  hydrate: () => Promise<void>;
  /** Refresh without the "already loaded" guard. */
  refetch: () => Promise<void>;
  /** Toggle one region's favorite state. Caller passes the full Region
   *  so the saved spots strip can render name + cover without an extra
   *  /regions/{id} fetch. */
  toggle: (region: Region) => Promise<void>;
  isFavorited: (regionId: string) => boolean;
};

const useFavoriteRegionsStore = create<State>((set, get) => ({
  regions: [],
  loaded: false,
  loading: false,
  hydrate: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const list = await outdoorApi.listFavoriteRegions();
      set({ regions: list ?? [], loaded: true });
    } catch {
      // Keep prior list on error.
    } finally {
      set({ loading: false });
    }
  },
  refetch: async () => {
    set({ loading: true });
    try {
      const list = await outdoorApi.listFavoriteRegions();
      set({ regions: list ?? [], loaded: true });
    } catch {
      // Keep prior list on error.
    } finally {
      set({ loading: false });
    }
  },
  toggle: async (region: Region) => {
    const { regions } = get();
    const wasFav = regions.some((r) => r.id === region.id);
    set({
      regions: wasFav
        ? regions.filter((r) => r.id !== region.id)
        : [...regions, { ...region, is_favorited: true }],
    });
    try {
      if (wasFav) await outdoorApi.unfavoriteRegion(region.id);
      else await outdoorApi.favoriteRegion(region.id);
    } catch {
      // Roll back on failure
      set({
        regions: wasFav
          ? [...get().regions, region]
          : get().regions.filter((r) => r.id !== region.id),
      });
    }
  },
  isFavorited: (regionId: string) => get().regions.some((r) => r.id === regionId),
}));

export default useFavoriteRegionsStore;
