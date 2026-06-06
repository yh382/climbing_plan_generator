// src/store/useMapSavedSpotHighlightStore.ts
// Lightweight signal store: which Saved Spot should the gyms-sheet
// `GymsSavedSpotsRow` highlight first?
//
// Flow: home `SavedSpotsCarousel` tap writes `highlightAreaId` here and
// then `router.navigate('/map')` to enter explore mode. The gyms sheet row
// reads this value and sorts the matching area to the front of its
// horizontal list, so the user lands in /map with the spot they just
// tapped already at index 0 (Apple-Maps-style "recent" cue) — single
// extra tap to actually drill into area mode.
//
// Intentionally one slot, no nonce: the gyms-sheet row treats this as a
// "preferred first" sort hint, not a navigation command. There is no
// state machine to drive — mode switching is entirely internal via the
// row's onPress → `onSelectAreaFromList`.

import { create } from 'zustand';

interface State {
  highlightAreaId: string | null;
  setHighlight: (areaId: string | null) => void;
}

const useMapSavedSpotHighlightStore = create<State>((set) => ({
  highlightAreaId: null,
  setHighlight: (highlightAreaId) => set({ highlightAreaId }),
}));

export default useMapSavedSpotHighlightStore;
