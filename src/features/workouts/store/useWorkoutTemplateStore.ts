// src/features/workouts/store/useWorkoutTemplateStore.ts
//
// Discovery + Mine lists of WorkoutTemplate. Refresh on focus (caller-
// driven via useFocusEffect). No AsyncStorage persist: lists are cheap
// to refetch from BE and authority lives there. Detail-level caching
// belongs in screen-level state, not here, so this store stays small.
//
// Codebase rule: no cross-store imports. Components that need both this
// store and useActiveWorkoutStore (e.g. tap a template card → start
// training) read both via hooks and call `useActiveWorkoutStore.getState()
// .startFromTemplate(...)` with the resolved templateData injected as a
// parameter — see Phase 4 wiring.

import { create } from "zustand";

import { workoutsApi } from "../api";
import type { WorkoutTemplateSummary } from "../types";

interface WorkoutTemplateState {
  /** Curated official templates — visible to all logged-in users. */
  officialList: WorkoutTemplateSummary[];
  /** Current user's custom templates. */
  myList: WorkoutTemplateSummary[];

  /** Loading flags, one per list, so the UI can show spinners
   *  independently (e.g. "official loading" while "mine" already shown). */
  isLoadingOfficial: boolean;
  isLoadingMine: boolean;

  /** Last error string per list (cleared on next successful refresh).
   *  Null = no error. */
  errorOfficial: string | null;
  errorMine: string | null;

  fetchOfficial: () => Promise<void>;
  fetchMine: () => Promise<void>;

  /** Replace a single row in `myList` (after PATCH) without a full
   *  refetch. Caller responsible for matching shape. */
  upsertMine: (template: WorkoutTemplateSummary) => void;

  /** Remove a row from `myList` after DELETE. */
  removeFromMine: (templateId: string) => void;
}

const useWorkoutTemplateStore = create<WorkoutTemplateState>((set, get) => ({
  officialList: [],
  myList: [],
  isLoadingOfficial: false,
  isLoadingMine: false,
  errorOfficial: null,
  errorMine: null,

  fetchOfficial: async () => {
    if (get().isLoadingOfficial) return;
    set({ isLoadingOfficial: true, errorOfficial: null });
    try {
      const list = await workoutsApi.list("official");
      set({ officialList: list, isLoadingOfficial: false });
    } catch (e: any) {
      set({
        isLoadingOfficial: false,
        errorOfficial: e?.message ?? "Failed to load official templates",
      });
    }
  },

  fetchMine: async () => {
    if (get().isLoadingMine) return;
    set({ isLoadingMine: true, errorMine: null });
    try {
      const list = await workoutsApi.list("mine");
      set({ myList: list, isLoadingMine: false });
    } catch (e: any) {
      set({
        isLoadingMine: false,
        errorMine: e?.message ?? "Failed to load your templates",
      });
    }
  },

  upsertMine: (template) => set((state) => {
    const next = state.myList.filter((t) => t.id !== template.id);
    next.unshift(template);
    return { myList: next };
  }),

  removeFromMine: (templateId) => set((state) => ({
    myList: state.myList.filter((t) => t.id !== templateId),
  })),
}));

export default useWorkoutTemplateStore;
