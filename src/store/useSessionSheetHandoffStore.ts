// src/store/useSessionSheetHandoffStore.ts
// Transient signal slots for session-feature formSheet routes
// (sheet-container-audit A1).
//
// `workoutLoggedAt` is a monotonically increasing timestamp the route writes
// when the user saves; the caller subscribes via useEffect to detect new
// events without needing to clear state (no stale-boolean trap).

import { create } from "zustand";

type State = {
  workoutLoggedAt: number;
  emitWorkoutLogged: () => void;
};

const useSessionSheetHandoffStore = create<State>((set) => ({
  workoutLoggedAt: 0,
  emitWorkoutLogged: () => set({ workoutLoggedAt: Date.now() }),
}));

export default useSessionSheetHandoffStore;
