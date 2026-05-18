// src/store/useFavoriteAreasStore.ts
// Single source of truth for the user's favorited outdoor areas.
// Replaces the prior per-component `useAreaFavoriteToggle` hook so
// AreaInfoSheet (writer) and GymsSavedSpotsRow (reader) stay in sync
// — toggling a favorite in the sheet immediately updates the saved
// spots strip without re-fetching on focus.
//
// Optimistic toggle: state changes first, BE call follows. On error
// the change is rolled back so the UI doesn't lie about persistence.
import { create } from 'zustand';

import { outdoorApi } from '../features/outdoor/api';
import type { Area } from '../features/outdoor/types';

type State = {
  areas: Area[];
  loaded: boolean;
  loading: boolean;
  /** Pull the full favorite list from BE. Idempotent — safe to call on
   *  every mount; subsequent callers no-op until reset(). */
  hydrate: () => Promise<void>;
  /** Refresh without the "already loaded" guard. */
  refetch: () => Promise<void>;
  /** Toggle one area's favorite state. Caller passes the full Area so
   *  the saved spots strip can render name + cover without an extra
   *  /areas/{id} fetch. */
  toggle: (area: Area) => Promise<void>;
  isFavorited: (areaId: string) => boolean;
};

const useFavoriteAreasStore = create<State>((set, get) => ({
  areas: [],
  loaded: false,
  loading: false,
  hydrate: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const list = await outdoorApi.listFavoriteAreas();
      set({ areas: list ?? [], loaded: true });
    } catch {
      // Keep prior list on error.
    } finally {
      set({ loading: false });
    }
  },
  refetch: async () => {
    set({ loading: true });
    try {
      const list = await outdoorApi.listFavoriteAreas();
      set({ areas: list ?? [], loaded: true });
    } catch {
      // Keep prior list on error.
    } finally {
      set({ loading: false });
    }
  },
  toggle: async (area: Area) => {
    const { areas } = get();
    const wasFav = areas.some((a) => a.id === area.id);
    set({
      areas: wasFav
        ? areas.filter((a) => a.id !== area.id)
        : [...areas, { ...area, is_favorited: true }],
    });
    try {
      if (wasFav) await outdoorApi.unfavoriteArea(area.id);
      else await outdoorApi.favoriteArea(area.id);
    } catch {
      // Roll back on failure
      set({
        areas: wasFav
          ? [...get().areas, area]
          : get().areas.filter((a) => a.id !== area.id),
      });
    }
  },
  isFavorited: (areaId: string) => get().areas.some((a) => a.id === areaId),
}));

export default useFavoriteAreasStore;
