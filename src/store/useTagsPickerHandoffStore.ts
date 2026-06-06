// src/store/useTagsPickerHandoffStore.ts
//
// Handoff slot for app/tags-picker.tsx formSheet (TR4b-3).
// Same Variant 2 (input + output) pattern as
// useExercisePickerHandoffStore — caller sets `request` before push,
// route reads it as initial state + writes `result` on save, caller
// subscribes to `result` via useEffect and clears once consumed.
//
// Why a formSheet route rather than a TrueSheet component:
// matches the rest of the app's sheet conventions (recent-climbs,
// body-info, csm-help, exercise-picker, …) — native UIKit nav bar +
// X close + prominent Save button, all paid for by the OS, no
// hand-drawn chrome.

import { create } from "zustand";

export interface TagsPickerRequest {
  /** Opaque caller-defined slot id. Currently a single caller
   *  (Template Builder) uses `"template"`. */
  targetId: string;
  /** Tags currently selected on the caller — preloaded into the
   *  sheet's draft on present. */
  initial: string[];
  /** System preset tag pool (climbing-goal slugs etc.). Rendered as
   *  Available pills inside the sheet. */
  presets: string[];
  /** Current tag color (hex). Seeds the Color section in the sheet
   *  so reopening the sheet shows the user's previous choice. */
  initialColor?: string;
}

export interface TagsPickerResult {
  targetId: string;
  tags: string[];
  /** Hex color chosen for the tag chips. FE-only decoration —
   *  not sent to the backend in this iteration. */
  color?: string;
}

interface State {
  request: TagsPickerRequest | null;
  setRequest: (r: TagsPickerRequest | null) => void;

  result: TagsPickerResult | null;
  setResult: (r: TagsPickerResult | null) => void;
}

const useTagsPickerHandoffStore = create<State>((set) => ({
  request: null,
  setRequest: (request) => set({ request }),

  result: null,
  setResult: (result) => set({ result }),
}));

export default useTagsPickerHandoffStore;
