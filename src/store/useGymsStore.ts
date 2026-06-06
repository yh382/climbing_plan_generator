import { create } from "zustand";
import type { GymPlace, LatLng } from "../../lib/poi/types";

interface GymsState {
  /** Active list — what GymList + map shape source render. Reflects
   *  the latest fetchNearby result, sorted + filtered by map center. */
  gyms: GymPlace[];
  /** BR Track D Day 7 follow-up — accumulated set across the session.
   *  As user pans, fetchNearby returns ~20 gyms per request centered on
   *  new map position; merging into `accumulatedGyms` (dedup by
   *  place_id) keeps the gym ShapeSource STABLE so `cluster:true`
   *  doesn't shift cluster positions on every pan. PLAN §3.2 redesign:
   *  industry standard pattern (Apple/Strava/AllTrails) — stable source
   *  data is the cluster invariant. */
  accumulatedGyms: Record<string, GymPlace>;
  loading: boolean;
  error: string | null;
  selectedGym: GymPlace | null;
  sheetIndex: number;
  query: string;
  userLoc: LatLng | null;
  center: LatLng | null;

  setGyms: (gyms: GymPlace[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedGym: (gym: GymPlace | null) => void;
  setSheetIndex: (index: number) => void;
  setQuery: (query: string) => void;
  setUserLoc: (loc: LatLng | null) => void;
  setCenter: (loc: LatLng | null) => void;
}

export const useGymsStore = create<GymsState>((set) => ({
  gyms: [],
  accumulatedGyms: {},
  loading: false,
  error: null,
  selectedGym: null,
  sheetIndex: 1,
  query: "",
  userLoc: null,
  center: null,

  setGyms: (gyms) =>
    set((s) => {
      // Merge into the accumulated set keyed by place_id so the gym
      // shape source stays stable across fetches. We don't drop old
      // entries here — accumulation is desired for the map cluster.
      const acc = { ...s.accumulatedGyms };
      for (const g of gyms) {
        acc[g.place_id] = g;
      }
      return { gyms, accumulatedGyms: acc };
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedGym: (selectedGym) => set({ selectedGym }),
  setSheetIndex: (sheetIndex) => set({ sheetIndex }),
  setQuery: (query) => set({ query }),
  setUserLoc: (userLoc) => set({ userLoc }),
  setCenter: (center) => set({ center }),
}));
