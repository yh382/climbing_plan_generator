// src/store/usePreviousTabStore.ts
// Tracks the most recent non-map tab the user visited. Read by the Map
// screen's top-left chevron.down button to navigate back to wherever the
// user came from (Home / Activity / Community / Profile) instead of
// always returning to Home.
//
// Local-only state — not persisted; resets to "index" (Home) on app launch.

import { create } from "zustand";

export type TabKey = "index" | "activity" | "community" | "profile";

type State = {
  previousTab: TabKey;
  setPreviousTab: (tab: TabKey) => void;
};

const usePreviousTabStore = create<State>((set) => ({
  previousTab: "index",
  setPreviousTab: (previousTab) => set({ previousTab }),
}));

export default usePreviousTabStore;
