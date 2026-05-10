// src/store/useOutdoorSheetHandoffStore.ts
// Transient handoff slots for outdoor-feature formSheet routes that need to
// return a value to their caller (sheet-container-audit A1).
//
// Pattern: caller subscribes via useEffect, route writes on success + router.back().
// Caller consumes the value and clears the slot. This is the standard substitute
// for the visible/onApply prop callback pattern that doesn't work across routes.

import { create } from "zustand";
import type { OutdoorList } from "../features/outdoor/types";

type State = {
  /** Set by app/outdoor-create-list.tsx after a successful create. Caller useEffect picks up + clears. */
  lastCreatedList: OutdoorList | null;
  setLastCreatedList: (list: OutdoorList | null) => void;

  /** Set by caller before opening app/outdoor-create-list.tsx in edit mode; route reads + populates form. */
  editingList: OutdoorList | null;
  setEditingList: (list: OutdoorList | null) => void;

  /** Set by app/outdoor-create-list.tsx after a successful PATCH. Caller useEffect picks up + clears. */
  lastUpdatedList: OutdoorList | null;
  setLastUpdatedList: (list: OutdoorList | null) => void;
};

const useOutdoorSheetHandoffStore = create<State>((set) => ({
  lastCreatedList: null,
  setLastCreatedList: (lastCreatedList) => set({ lastCreatedList }),
  editingList: null,
  setEditingList: (editingList) => set({ editingList }),
  lastUpdatedList: null,
  setLastUpdatedList: (lastUpdatedList) => set({ lastUpdatedList }),
}));

export default useOutdoorSheetHandoffStore;
