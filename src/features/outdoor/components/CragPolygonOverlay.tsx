// src/features/outdoor/components/CragPolygonOverlay.tsx
//
// BU 2026-06-07 — visual outline around a crag's spatial extent during
// crag-browse sub-state. User拍方案 A: only the currently focused/browsing
// crag gets a polygon, not all viewport crags (would visually cluster).
//
// Visual: pink stroke + light pink fill, OpenBeta-ish. Doesn't compete
// with wall pin focus; renders BENEATH wall pins via a low z-index source
// position (mounted before the wall-pin clusters in MapScreenMapbox).
//
// The polygon is computed client-side from focused crag's walls via
// `computeCragPolygon` (convex hull / rectangle fallback). The caller
// gates `visible` on `focusedCragDetail.id === browsingCrag.crag_id` to
// avoid stale polygon from a previous crag during async detail fetch.

import React, { useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';

import { useThemeColors } from '../../../lib/useThemeColors';
import { computeCragPolygon } from '../cragPolygon';
import type { Wall } from '../types';

const POLYGON_FILL_OPACITY = 0.08;
const POLYGON_STROKE_OPACITY = 0.85;
const POLYGON_STROKE_WIDTH = 2;

type Props = {
  walls: Wall[] | undefined;
  visible: boolean;
};

export default function CragPolygonOverlay({ walls, visible }: Props) {
  const colors = useThemeColors();
  /* Memoize hull on the wall set so we don't recompute on every map
     camera idle / scroll. `walls` reference is stable across renders
     (it's `focusedCragDetail.walls` from React state) — only changes
     when focusedCragDetail re-fetches. */
  const feature = useMemo(() => {
    if (!visible || !walls) return null;
    return computeCragPolygon(walls);
  }, [walls, visible]);

  if (!feature) return null;

  const shape: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [feature],
  };

  return (
    <MapboxGL.ShapeSource id="crag-polygon-src" shape={shape as any}>
      <MapboxGL.FillLayer
        id="crag-polygon-fill"
        style={{
          fillColor: colors.cragBoundary,
          fillOpacity: POLYGON_FILL_OPACITY,
        }}
      />
      <MapboxGL.LineLayer
        id="crag-polygon-line"
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
