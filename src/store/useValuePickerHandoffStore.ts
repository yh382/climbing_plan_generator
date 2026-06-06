// src/store/useValuePickerHandoffStore.ts
//
// Generic numeric value picker formSheet handoff (FRONTEND_MAP §A1
// Variant 2). Replaces the per-feature RestPickerSheet TrueSheet —
// one route serves every wheel-based numeric input across the app:
// rest durations, reps, time, load weight / percent.
//
// Modes:
//   - "duration"  → 2-wheel min/sec, returns seconds total
//   - "count"     → 1-wheel integer (reps)
//   - "load"      → 1-wheel integer with caller-supplied unit label

import { create } from "zustand";

export type ValuePickerMode = "duration" | "count" | "load";

export interface ValuePickerRequest {
  /** Opaque caller-defined slot id (e.g. `${blockIdx}:${itemIdx}:${field}`). */
  targetId: string;
  /** Sheet title — "Rest" / "Reps" / "Time" / "Weight" etc. */
  title: string;
  initial: number;
  mode: ValuePickerMode;
  /** Display label for count/load modes ("reps", "lb", "% Max"). */
  unitLabel?: string;
  /** Upper bound for count/load wheel. Default 60 / 500 respectively. */
  max?: number;
  /** Step for count/load wheel. Default 1 / 5. */
  step?: number;
}

export interface ValuePickerResult {
  targetId: string;
  value: number;
}

interface State {
  request: ValuePickerRequest | null;
  setRequest: (r: ValuePickerRequest | null) => void;

  result: ValuePickerResult | null;
  setResult: (r: ValuePickerResult | null) => void;
}

const useValuePickerHandoffStore = create<State>((set) => ({
  request: null,
  setRequest: (request) => set({ request }),

  result: null,
  setResult: (result) => set({ result }),
}));

export default useValuePickerHandoffStore;
