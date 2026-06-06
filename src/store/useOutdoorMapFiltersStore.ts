// src/store/useOutdoorMapFiltersStore.ts
// BR Track D Day 6 — outdoor map filter chips state.
//
// Single tiny store backing the `FilterChipsBar` (Day 6 §8). 4 mutually-
// exclusive chips: All / Sport / Trad / Boulder. State lives in zustand
// (not local component state) because two consumers care:
//   1. MapScreenMapbox → forwards style/discipline params to
//      `useViewportPins(bbox, { style, discipline })` for server-side
//      filtering of `/outdoor/pins`.
//   2. RoutesListSheet → filters the focused-wall route list locally
//      (the wall's full route set is already loaded by `focusOnWall`;
//      we just narrow it client-side to match the cluster view).
//
// Ephemeral by design — no AsyncStorage persistence. The map filter
// should reset to "All" on a fresh app session so the user sees the
// full pin set on first present (PLAN §8 — "All is the default visual").

import { create } from "zustand";

export type OutdoorMapFilter = "all" | "sport" | "trad" | "boulder";

/** BE params derived from the selected chip. PLAN §8 mapping:
 *  - all     → no filter params (BE returns everything)
 *  - sport   → style='sport'
 *  - trad    → style='trad'
 *  - boulder → discipline='boulder' (covers all V-grade routes regardless
 *              of style label drift in OpenBeta data)
 */
export type OutdoorMapFilterParams = {
  style?: "sport" | "trad";
  discipline?: "boulder";
};

interface OutdoorMapFiltersState {
  selected: OutdoorMapFilter;
  setSelected: (v: OutdoorMapFilter) => void;
  /** Derive the BE param shape from the current chip. */
  params: () => OutdoorMapFilterParams;
}

const useOutdoorMapFiltersStore = create<OutdoorMapFiltersState>((set, get) => ({
  selected: "all",
  setSelected: (v) => set({ selected: v }),
  params: () => {
    switch (get().selected) {
      case "sport":
        return { style: "sport" };
      case "trad":
        return { style: "trad" };
      case "boulder":
        return { discipline: "boulder" };
      case "all":
      default:
        return {};
    }
  },
}));

export default useOutdoorMapFiltersStore;
