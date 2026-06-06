// src/features/mapscreen/useMapMode.ts
// Drives the unified MapScreen. `mode` determines which data source + sheet
// content is active; `prevCamera` is a one-slot snapshot so we can fly back
// to the user's explore-mode view when they exit area/list mode.
//
// Snapshot semantics: `rememberCamera` takes the latest observed camera from
// MapView's onCameraChanged. Re-entering a deeper mode OVERWRITES the slot
// (no stack) — back always returns to the most recent explore-mode view.
//
// BS Track C (2026-06-06) — semantic rename `gyms` → `explore`. The default
// mode actually shows gyms + outdoor crag overview + search + saved spots
// (mixed surface), so "explore" is more accurate. Long-term 5-mode split
// (explore / destination / crag / approach / list) deferred to P2/P3.
// Domain terms (gymsApi, useGymsStore, community 'gyms' tab) untouched.

import { useCallback, useRef, useState } from 'react';

export type MapMode =
  | { kind: 'explore' }
  | { kind: 'area'; areaId: string; areaName?: string }
  | { kind: 'list'; listId: string };

export interface CameraSnapshot {
  center: [number, number];
  zoom: number;
}

export interface UseMapModeResult {
  mode: MapMode;
  prevCamera: CameraSnapshot | null;
  /** Observe current camera; consumers pass it from MapView.onCameraChanged. */
  observeCamera: (snapshot: CameraSnapshot) => void;
  /** Enter area mode. Snapshots the last-observed explore-mode camera first. */
  enterArea: (areaId: string, areaName?: string) => void;
  /** Enter list mode. Same snapshot semantics as enterArea. */
  enterList: (listId: string) => void;
  /** Return to explore mode. Consumer should flyTo(prevCamera ?? defaultView). */
  backToExplore: () => void;
}

export function useMapMode(initial: MapMode = { kind: 'explore' }): UseMapModeResult {
  const [mode, setMode] = useState<MapMode>(initial);
  const [prevCamera, setPrevCamera] = useState<CameraSnapshot | null>(null);
  // Live camera tracked via ref so we don't rerender on every pan/zoom. We
  // only hoist it into prevCamera at the exact moment the user transitions
  // away from explore mode.
  const lastCameraRef = useRef<CameraSnapshot | null>(null);
  const modeRef = useRef<MapMode>(initial);

  const observeCamera = useCallback((snapshot: CameraSnapshot) => {
    lastCameraRef.current = snapshot;
  }, []);

  const snapshotIfExplore = useCallback(() => {
    if (modeRef.current.kind === 'explore' && lastCameraRef.current) {
      setPrevCamera(lastCameraRef.current);
    }
  }, []);

  const enterArea = useCallback(
    (areaId: string, areaName?: string) => {
      snapshotIfExplore();
      const next: MapMode = { kind: 'area', areaId, areaName };
      modeRef.current = next;
      setMode(next);
    },
    [snapshotIfExplore],
  );

  const enterList = useCallback(
    (listId: string) => {
      snapshotIfExplore();
      const next: MapMode = { kind: 'list', listId };
      modeRef.current = next;
      setMode(next);
    },
    [snapshotIfExplore],
  );

  const backToExplore = useCallback(() => {
    const next: MapMode = { kind: 'explore' };
    modeRef.current = next;
    setMode(next);
  }, []);

  return { mode, prevCamera, observeCamera, enterArea, enterList, backToExplore };
}
