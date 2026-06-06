/**
 * useViewportPins — BR Track D Day 5 bbox-scoped pin loader.
 *
 * Replaces the per-Region `getMapPins(regionId)` waterfall (which loaded
 * the full region's pins up-front regardless of camera position) with a
 * bbox query that follows the camera (`/outdoor/pins?bbox=...`).
 *
 * Per `docs/maps/data-flows/14-outdoor-map-pins-bbox.md`:
 *  - 300ms debounce on bbox changes — Mapbox onMapMove fires per frame
 *    during gestures; without debouncing this floods the BE.
 *  - In-flight requests are not aborted (apiClient lacks AbortSignal),
 *    but stale responses are dropped via a request id seq.
 *  - `truncated: true` from BE flags the FE to render a "zoom in" hint.
 *
 * Day 5a delivery: standalone hook. Day 5b wires it into MapScreenMapbox.
 */
import { useEffect, useRef, useState } from 'react';

import { outdoorApi } from './api';
import type { RoutePin } from './types';

export type ViewportBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type UseViewportPinsOptions = {
  /** Style filter (csv of style values). When `undefined`, no filter. */
  style?: string;
  discipline?: 'boulder' | 'rope' | 'other';
  /** Debounce on bbox changes in ms. Default 300. */
  debounceMs?: number;
  /** Skip fetching entirely. Useful when the map is in a non-outdoor mode. */
  enabled?: boolean;
  /** BE-side cap. Default 5000 per data-flow doc 14 contract. */
  limit?: number;
};

export type UseViewportPinsResult = {
  pins: RoutePin[];
  /** True when the BE response hit the limit cap. FE shows a "zoom in" hint. */
  truncated: boolean;
  /** True while a fetch is in-flight. UI may dim the cluster or show a chip. */
  loading: boolean;
  /** Last error from the BE. UI may toast or silently log. */
  error: string | null;
};

export function useViewportPins(
  bbox: ViewportBbox | null,
  options: UseViewportPinsOptions = {},
): UseViewportPinsResult {
  const { style, discipline, debounceMs = 300, enabled = true, limit } = options;

  const [pins, setPins] = useState<RoutePin[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Monotonic seq so we can drop stale responses when a newer fetch lands. */
  const seqRef = useRef(0);

  useEffect(() => {
    if (!enabled || !bbox) {
      setPins([]);
      setTruncated(false);
      return;
    }

    // Snapshot bbox at effect-fire time so the lint warning is honored
    // (the effect only depends on the 4 primitive coords below) and so
    // the closure can't accidentally read a stale bbox after a remount.
    const bboxAtFire = bbox;
    const debounceTimer = setTimeout(() => {
      const fetchSeq = ++seqRef.current;
      setLoading(true);
      setError(null);
      outdoorApi
        .listPins({
          bbox: bboxAtFire,
          style,
          discipline,
          limit,
        })
        .then((resp) => {
          // Drop stale response if a newer fetch raced past us.
          if (fetchSeq !== seqRef.current) return;
          setPins(resp.items);
          setTruncated(resp.truncated);
        })
        .catch((err) => {
          if (fetchSeq !== seqRef.current) return;
          const message = err instanceof Error ? err.message : 'Failed to load pins';
          setError(message);
        })
        .finally(() => {
          if (fetchSeq !== seqRef.current) return;
          setLoading(false);
        });
    }, debounceMs);

    return () => {
      clearTimeout(debounceTimer);
    };
    // The 4 bbox coords below cover the bbox identity for the
    // exhaustive-deps lint — we deliberately don't depend on the bbox
    // object reference itself, since callers may pass a fresh object
    // every render with the same coords.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bbox?.south,
    bbox?.west,
    bbox?.north,
    bbox?.east,
    style,
    discipline,
    debounceMs,
    enabled,
    limit,
  ]);

  return { pins, truncated, loading, error };
}
