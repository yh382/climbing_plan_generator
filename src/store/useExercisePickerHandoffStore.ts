// src/store/useExercisePickerHandoffStore.ts
//
// Handoff slot for the app/exercise-picker.tsx formSheet (TR4b).
// FormSheet routes sit outside the caller's JSX tree → the classic
// visible/onApply prop callback pattern doesn't work. Variant 2 of the
// FRONTEND_MAP-documented handoff pattern (input + output slots):
//
//   caller          → setRequest({ targetId }) + router.push(...)
//   route           → reads request; on tap row, setResult({...}) + back
//   caller useFocus → consumes result + setResult(null) to clear
//
// Lifecycle ownership per FRONTEND_MAP A1 rules:
//   - Route owns the `result` slot (useEffect cleanup clears it)
//   - Caller owns the `request` slot (set before push, clear after consume)
//
// The targetId lets the caller (Template Builder) tag which item in
// which block the user is editing, so a single store can serve any
// number of pickers without an instance map.

import { create } from "zustand";

import type { ExerciseListItem } from "../features/exercises/api";

export interface ExercisePickerRequest {
  /** Opaque caller-defined slot id. Template Builder uses
   *  `${blockIndex}:add` when adding new items into a block, or
   *  `${blockIndex}:${itemIndex}:replace` when swapping the action_id
   *  on an existing row. The route returns the same targetId verbatim
   *  so the caller can branch on the suffix. */
  targetId: string;
  /** When true the picker UI runs in single-select replace mode
   *  (sticky CTA hidden, tap a row immediately returns + dismisses).
   *  When false the picker runs in multi-select add mode (Motra-style:
   *  checkbox rows + bottom "Add Exercise (n)" CTA). */
  singleSelect?: boolean;
}

export interface ExercisePickerResult {
  targetId: string;
  /** Multi-select returns the full picked list. Single-select returns
   *  a one-element list to keep the contract uniform. */
  exercises: ExerciseListItem[];
}

interface State {
  request: ExercisePickerRequest | null;
  setRequest: (r: ExercisePickerRequest | null) => void;

  result: ExercisePickerResult | null;
  setResult: (r: ExercisePickerResult | null) => void;
}

const useExercisePickerHandoffStore = create<State>((set) => ({
  request: null,
  setRequest: (request) => set({ request }),

  result: null,
  setResult: (result) => set({ result }),
}));

export default useExercisePickerHandoffStore;
