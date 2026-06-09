// src/features/outdoor/components/AreaCoverageOverlay.tsx
//
// CA Phase 5.3 — server-driven coverage polygon replacing the client-side
// CragPolygonOverlay. Previously the hull was computed locally from a
// crag's walls; under CA the canonical outdoor_areas tree carries the
// full subtree route fan-out, so the BE's monotone-chain hull is the
// authoritative source (computes from ALL routes under the subtree, not
// just walls of the focused crag).
//
// Behavior per plan v8 §Phase 5:
//   data.polygon === null           → silently hide (subtree has <3 route points)
//   error.error === coverage_too_broad → silently hide + log (country/state
//                                        level — BE refuses to compute)
//   error.error === subtree_too_large  → silently hide + log (>5,000 routes
//                                        — BE refuses to compute)
//   else                            → render polygon
//
// Toast vs silent: plan v8 specs a tr() toast on the 2 error cases, but
// the polygon is purely decorative — pins + boundary already convey state.
// Surfacing a modal Alert mid-pan would be intrusive. Errors instead emit
// a console.warn with the error.error field so debug surfaces flag drift
// without nagging the user. Re-add a user-visible signal later if dogfood
// finds the silent hide confusing.
//
// Z-order: this component must mount BEFORE the wall/route pin clusters
// in MapScreenMapbox JSX so the polygon paints UNDER the pins (Mapbox-RN
// renders later children on top).

import React, { useMemo, useRef, useEffect } from 'react';
import MapboxGL from '@rnmapbox/maps';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useAreaCoverage } from '../hooks';
import { ApiError } from '../../../lib/apiClient';

const POLYGON_FILL_OPACITY = 0.08;
const POLYGON_STROKE_OPACITY = 0.85;
const POLYGON_STROKE_WIDTH = 2;

type CoverageErrorKind =
  | 'coverage_too_broad'
  | 'subtree_too_large'
  | 'bbox_invalid';

/**
 * Pulls the BE's structured detail.error code out of an ApiError. The BE
 * wraps the structured payload inside FastAPI's `{detail: {...}}` envelope,
 * which apiClient surfaces as ApiError.body (raw string). Returns null
 * when the error doesn't match the contract — caller treats as opaque
 * failure (silently hide).
 */
function readCoverageErrorKind(err: unknown): CoverageErrorKind | null {
  if (!(err instanceof ApiError) || err.status !== 422) return null;
  try {
    const parsed = JSON.parse(err.body) as
      | { detail?: { error?: string } }
      | null;
    const kind = parsed?.detail?.error;
    if (
      kind === 'coverage_too_broad' ||
      kind === 'subtree_too_large' ||
      kind === 'bbox_invalid'
    ) {
      return kind;
    }
  } catch {
    // raw body wasn't JSON — fall through to null
  }
  return null;
}

type Props = {
  /** Canonical outdoor_area.id. When null the overlay hides + skips the
   *  network call. Replacing previous `walls` prop drove by browsingCrag. */
  areaId: string | null;
};

export default function AreaCoverageOverlay({ areaId }: Props) {
  const colors = useThemeColors();
  const { data, error } = useAreaCoverage(areaId);

  // Log error kind once per (areaId, errorKind) change for debug. Avoids
  // log spam from useFetchOnce's re-runs by storing the last logged key.
  const lastLoggedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!error) return;
    const kind = readCoverageErrorKind(error);
    const key = `${areaId ?? 'null'}:${kind ?? 'opaque'}`;
    if (lastLoggedRef.current === key) return;
    lastLoggedRef.current = key;
    // eslint-disable-next-line no-console
    console.warn('[AreaCoverageOverlay] coverage unavailable', {
      areaId,
      kind: kind ?? 'opaque',
      message: error instanceof Error ? error.message : String(error),
    });
  }, [areaId, error]);

  const shape = useMemo<GeoJSON.FeatureCollection | null>(() => {
    if (!data?.polygon) return null;
    return { type: 'FeatureCollection', features: [data.polygon] };
  }, [data]);

  if (!shape) return null;

  return (
    <MapboxGL.ShapeSource id="area-coverage-src" shape={shape}>
      <MapboxGL.FillLayer
        id="area-coverage-fill"
        style={{
          fillColor: colors.cragBoundary,
          fillOpacity: POLYGON_FILL_OPACITY,
        }}
      />
      <MapboxGL.LineLayer
        id="area-coverage-line"
        style={{
          lineColor: colors.cragBoundary,
          lineOpacity: POLYGON_STROKE_OPACITY,
          lineWidth: POLYGON_STROKE_WIDTH,
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
