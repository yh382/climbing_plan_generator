// src/store/useOutdoorFiltersStore.ts
// Local-only outdoor filter state shared between caller (RoutesSegment) and
// formSheet picker route (app/outdoor-grade-range.tsx). Not persisted — filters
// reset between app launches.
//
// Background: formSheet routes live outside the caller's JSX tree, so the
// classic visible/onApply prop callback pattern doesn't work. This store is
// the standard "picker handoff" pattern adopted in sheet-container-audit A1
// (Option 1). For backend-writing sheets (LogWorkout / BetaShare / OutdoorSend)
// the route writes directly to its own feature store / backend and just calls
// router.back() — no handoff store needed.

import { create } from "zustand";

export type GradeRange = {
  min: string | null;
  max: string | null;
};

type State = {
  gradeRange: GradeRange;
  setGradeRange: (range: GradeRange) => void;
};

const useOutdoorFiltersStore = create<State>((set) => ({
  gradeRange: { min: null, max: null },
  setGradeRange: (gradeRange) => set({ gradeRange }),
}));

export default useOutdoorFiltersStore;
