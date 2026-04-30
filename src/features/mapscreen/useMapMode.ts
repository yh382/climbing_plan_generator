// src/features/mapscreen/useMapMode.ts
// Drives the unified MapScreen. `mode` determines which data source + sheet
// content is active; `prevCamera` is a one-slot snapshot so we can fly back
// to the user's gyms-mode view when they exit area/list mode.
//
// Snapshot semantics: `rememberCamera` takes the latest observed camera from
// MapView's onCameraChanged. Re-entering a deeper mode OVERWRITES the slot
// (no stack) — back always returns to the most recent gyms-mode view.

import { useCallback, useRef, useState } from 'react';

export type MapMode =
  | { kind: 'gyms' }
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
  /** Enter area mode. Snapshots the last-observed gyms-mode camera first. */
  enterArea: (areaId: string, areaName?: string) => void;
  /** Enter list mode. Same snapshot semantics as enterArea. */
  enterList: (listId: string) => void;
  /** Return to gyms mode. Consumer should flyTo(prevCamera ?? defaultView). */
  backToGyms: () => void;
}

export function useMapMode(initial: MapMode = { kind: 'gyms' }): UseMapModeResult {
  const [mode, setMode] = useState<MapMode>(initial);
  const [prevCamera, setPrevCamera] = useState<CameraSnapshot | null>(null);
  // Live camera tracked via ref so we don't rerender on every pan/zoom. We
  // only hoist it into prevCamera at the exact moment the user transitions
  // away from gyms mode.
  const lastCameraRef = useRef<CameraSnapshot | null>(null);
  const modeRef = useRef<MapMode>(initial);

  const observeCamera = useCallback((snapshot: CameraSnapshot) => {
    lastCameraRef.current = snapshot;
  }, []);

  const snapshotIfGyms = useCallback(() => {
    if (modeRef.current.kind === 'gyms' && lastCameraRef.current) {
      setPrevCamera(lastCameraRef.current);
    }
  }, []);

  const enterArea = useCallback(
    (areaId: string, areaName?: string) => {
      snapshotIfGyms();
      const next: MapMode = { kind: 'area', areaId, areaName };
      modeRef.current = next;
      setMode(next);
    },
    [snapshotIfGyms],
  );

  const enterList = useCallback(
    (listId: string) => {
      snapshotIfGyms();
      const next: MapMode = { kind: 'list', listId };
      modeRef.current = next;
      setMode(next);
    },
    [snapshotIfGyms],
  );

  const backToGyms = useCallback(() => {
    const next: MapMode = { kind: 'gyms' };
    modeRef.current = next;
    setMode(next);
  }, []);

  return { mode, prevCamera, observeCamera, enterArea, enterList, backToGyms };
}
