// src/features/mapscreen/hooks/useMapSheetState.ts
// Shared TrueSheet state for map pages — 3-detent config
// (collapsed ↔ medium ↔ large), safeResize/collapseSheet guards,
// auto-present on mount.
//
// Design note: an earlier iteration removed MEDIUM because users said drag
// from COLLAPSED was getting stuck at MEDIUM instead of reaching LARGE.
// User has since reverted that decision — they want MEDIUM back so they
// can deliberately stop at an intermediate detent. The cost is the old
// snap-stuck-at-MEDIUM behavior; the user is accepting it in exchange
// for the control.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";

/** Default collapsed fraction for screens that want a content peek at
 *  the bottom detent — e.g. crag-map in area mode, where the user
 *  wants to see the first route card without expanding the sheet. */
const DEFAULT_COLLAPSED_FRACTION = 0.25;

/** Legacy collapsed size for gyms mode: 76pt header-only. Translated
 *  to a fraction at mount. Kept small so the map fills the screen. */
const HEADER_ONLY_COLLAPSED_PT = 76;

export const DETENT_COLLAPSED = 0;
/** ~45% height — intermediate stop, user can deliberately rest here. */
export const DETENT_MEDIUM = 1;
/** ~80% height — near full-screen. Triggers top-bar fade. */
export const DETENT_LARGE = 2;

export interface UseMapSheetStateOptions {
  /** Fires once per transition when the user DRAGS the sheet up from
   *  COLLAPSED to a taller detent (MEDIUM/LARGE). Programmatic resizes
   *  via `safeResize` are filtered out. Consumers use this to refresh
   *  sheet content based on whatever the map is currently centered on
   *  — the manual drag is an expression of "I want to browse from
   *  here", so we snap the sheet's focus to match. */
  onManualOpen?: () => void;
  /** Detent index to open at on mount. Defaults to COLLAPSED. Pass
   *  MEDIUM for screens where the user lands already "browsing"
   *  (e.g. crag-map in area mode: the reason they navigated there
   *  is to see the routes, not the map). */
  initialDetent?: number;
  /** Fraction of window height for the COLLAPSED detent.
   *  - Pass `"header-only"` for the 76pt gyms-style sheet (just the
   *    search bar, max map visibility).
   *  - Pass a number (e.g. `0.25`) to show a peek of content at
   *    collapsed — useful in crag/area mode so the first route card
   *    is visible without expanding.
   *  Defaults to `0.25`. May be read per-render (the detents memo
   *  depends on it) so callers can change it dynamically when mode
   *  transitions (e.g. gyms ↔ area in MapScreenMapbox). */
  collapsedFraction?: number | "header-only";
}

export interface UseMapSheetStateResult {
  sheetRef: React.RefObject<TrueSheet | null>;
  detents: readonly [number, number, number];
  /** Reactive state — changes on detent settle. Consumers can read this to
   *  drive UI that depends on how tall the sheet currently is (e.g. fading
   *  a floating toolbar when the sheet expands to large). */
  currentDetentIndex: number;
  /** Mark that the native sheet has finished presenting. */
  onDidPresent: () => void;
  /** Mark that the native sheet is about to / has dismissed (ref invalid). */
  onWillDismiss: () => void;
  onDidDismiss: () => void;
  /** Track current detent so no-op resize calls are skipped. */
  onDetentChange: (e: { nativeEvent: { index: number } }) => void;
  /** Safely call TrueSheet.resize — guards against pre-present & post-dismiss races. */
  safeResize: (index: number) => void;
  /** Safely call TrueSheet.present — no-ops if already presented (silences
   *  TrueSheet's "sheet is already presented" warning that flooded the
   *  console when mount-effect + focus-effect both raced to present()). */
  safePresent: (index?: number) => void;
  /** Collapse to search-bar detent (no-op if already collapsed). */
  collapseSheet: () => void;
}

export function useMapSheetState(options?: UseMapSheetStateOptions): UseMapSheetStateResult {
  const initialDetent = options?.initialDetent ?? DETENT_COLLAPSED;
  const sheetRef = useRef<TrueSheet | null>(null);
  const sheetPresentedRef = useRef(false);
  const currentDetentRef = useRef<number>(initialDetent);
  // Set by safeResize immediately before calling TrueSheet.resize; cleared
  // on the next onDetentChange. This lets us tell drag-settles apart from
  // programmatic resizes, which is what `onManualOpen` consumes.
  const programmaticResizeRef = useRef(false);
  // Hold the latest onManualOpen so callers can declare the handler below
  // the `useMapSheetState` call (where all the state it needs is in scope).
  // Reassigned on every render — cheap, no re-renders triggered.
  const onManualOpenRef = useRef<(() => void) | undefined>(options?.onManualOpen);
  onManualOpenRef.current = options?.onManualOpen;
  // Reactive mirror of currentDetentRef — used by components that need to
  // re-render when the detent changes. The ref is still the source of truth
  // for within-callback logic (to avoid stale closures).
  const [currentDetentIndex, setCurrentDetentIndex] = useState<number>(initialDetent);

  // 3 detents: collapsed / medium (45%) / large (80%). MEDIUM
  // matches Apple Maps' medium detent. Collapsed is variable:
  // "header-only" for gyms mode (76pt, max map visibility), numeric
  // for modes that benefit from a content peek (crag area: 0.25).
  const collapsedOpt = options?.collapsedFraction ?? DEFAULT_COLLAPSED_FRACTION;
  const detents = useMemo(() => {
    const windowHeight = Dimensions.get("window").height;
    const collapsed =
      collapsedOpt === "header-only"
        ? HEADER_ONLY_COLLAPSED_PT / windowHeight
        : collapsedOpt;
    return [collapsed, 0.45, 0.8] as const;
  }, [collapsedOpt]);

  const safeResize = useCallback((index: number) => {
    if (!sheetPresentedRef.current) return;
    // Flag this resize as programmatic so the upcoming onDetentChange
    // doesn't mis-fire the onManualOpen callback.
    programmaticResizeRef.current = true;
    // Catch rejections — even with the presented guard, a resize that
    // fires between onDidDismiss and componentWillUnmount could hit
    // SHEET_NOT_FOUND. We silence that here.
    sheetRef.current?.resize(index).catch(() => {});
  }, []);

  const safePresent = useCallback(
    (index?: number) => {
      const detent = index ?? initialDetent;
      // Already presented → resize instead of re-presenting (TrueSheet
      // logs a warning if present() is called twice; this is the
      // contract the warning suggests).
      if (sheetPresentedRef.current) {
        safeResize(detent);
        return;
      }
      // Optimistically flip the ref so re-entrant safePresent calls
      // within the same tick (mount-effect + focus-effect race) coalesce
      // to a single native present. onDidPresent will reassert true;
      // dismiss callbacks reset to false.
      sheetPresentedRef.current = true;
      currentDetentRef.current = detent;
      // TrueSheet's initial present() doesn't fire onDetentChange, so the
      // reactive mirror would otherwise stay stuck at the last detent
      // before dismiss (e.g. LARGE) even though the sheet is now at
      // `detent` (e.g. MEDIUM on focus re-present). Consumers that key UI
      // off currentDetentIndex (top-bar hide-at-LARGE) would then render
      // a stale hidden state.
      setCurrentDetentIndex(detent);
      sheetRef.current?.present(detent).catch(() => {
        // Roll back if native present rejected (e.g. ref torn down).
        sheetPresentedRef.current = false;
      });
    },
    [initialDetent, safeResize],
  );

  // Safety net for initialDetentIndex declarative auto-present.
  // `didMoveToWindow` can miss its presenter lookup behind navigation
  // transitions; an explicit present() on the next frame guarantees the
  // sheet settles at the configured initial detent every time the
  // screen mounts.
  useEffect(() => {
    const id = requestAnimationFrame(() => safePresent(initialDetent));
    return () => {
      cancelAnimationFrame(id);
      // Mark unpresented so any late resize during unmount transition
      // doesn't try to touch a torn-down native view.
      sheetPresentedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapseSheet = useCallback(() => {
    if (currentDetentRef.current === DETENT_COLLAPSED) return;
    currentDetentRef.current = DETENT_COLLAPSED;
    safeResize(DETENT_COLLAPSED);
  }, [safeResize]);

  const onDidPresent = useCallback(() => {
    sheetPresentedRef.current = true;
  }, []);

  const onWillDismiss = useCallback(() => {
    sheetPresentedRef.current = false;
  }, []);

  const onDidDismiss = useCallback(() => {
    sheetPresentedRef.current = false;
  }, []);

  const onDetentChange = useCallback((e: { nativeEvent: { index: number } }) => {
    const idx = e.nativeEvent.index;
    const prev = currentDetentRef.current;
    const wasProgrammatic = programmaticResizeRef.current;
    programmaticResizeRef.current = false;
    currentDetentRef.current = idx;
    setCurrentDetentIndex(idx);
    // User dragged from COLLAPSED up to a browsing detent — caller wants
    // to know so they can refresh the sheet content for what the map is
    // now centered on. Excludes programmatic resize() calls.
    if (!wasProgrammatic && prev === DETENT_COLLAPSED && idx !== DETENT_COLLAPSED) {
      onManualOpenRef.current?.();
    }
  }, []);

  return {
    sheetRef,
    detents,
    currentDetentIndex,
    onDidPresent,
    onWillDismiss,
    onDidDismiss,
    onDetentChange,
    safeResize,
    safePresent,
    collapseSheet,
  };
}
