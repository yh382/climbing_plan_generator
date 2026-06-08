// src/features/outdoor/cragPolygon.ts
//
// BU 2026-06-07 — compute a polygon outlining a crag's spatial extent.
//
// Per user 2026-06-07 拍方案 A: only show overlay for currently focused/
// browsing crag. Implementation is purely client-side: we already have
// every wall's lat/lng (BV 100% populated after wall.lat fix in 5e16ced),
// so a convex hull over wall points is enough. Concave hull / alpha shape
// would be more accurate but ROI is low at this stage.
//
// Edge cases:
//   - 0 valid points  → null (overlay component skips)
//   - 1 point         → 0.005° (~500 m) square buffer around the point
//   - 2 points        → rectangle 0.005° padding around the bbox
//   - colinear ≥3     → fallback to rectangle (avoids 0-area hull)
//   - ≥3 non-colinear → monotone chain convex hull

import type { Wall } from './types';

type Pt = [number, number]; // [lng, lat] — GeoJSON order

const BUFFER_DEG = 0.005; // ~500 m at mid latitudes

/** Cross product of OA → OB. Positive = counter-clockwise turn. */
function cross(o: Pt, a: Pt, b: Pt): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Monotone chain convex hull. O(n log n). Returns CCW ordered points
 *  including the closing repeat of the start. Returns null if all points
 *  are colinear (caller falls back to rectangle). */
function convexHull(points: Pt[]): Pt[] | null {
  if (points.length < 3) return null;
  const pts = [...points].sort((a, b) =>
    a[0] === b[0] ? a[1] - b[1] : a[0] - b[0],
  );
  const lower: Pt[] = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  if (hull.length < 3) return null; // colinear collapse
  hull.push(hull[0]); // close the ring
  return hull;
}

/** Rectangle polygon from a bbox with padding. Used as fallback for
 *  1/2-point crags and colinear sets. Returns CCW closed ring. */
function rectangle(minLng: number, maxLng: number, minLat: number, maxLat: number): Pt[] {
  const lng0 = minLng - BUFFER_DEG;
  const lng1 = maxLng + BUFFER_DEG;
  const lat0 = minLat - BUFFER_DEG;
  const lat1 = maxLat + BUFFER_DEG;
  return [
    [lng0, lat0],
    [lng1, lat0],
    [lng1, lat1],
    [lng0, lat1],
    [lng0, lat0],
  ];
}

export type CragPolygonFeature = GeoJSON.Feature<GeoJSON.Polygon, { kind: 'crag-polygon' }>;

/** Build the polygon feature for a crag from its walls. Returns null
 *  when there are no valid coords (pre-BV legacy walls all have NULL
 *  lat/lng → polygon won't render, which is the intended graceful
 *  fallback). */
export function computeCragPolygon(walls: Wall[]): CragPolygonFeature | null {
  const points: Pt[] = [];
  for (const w of walls) {
    if (w.lat != null && w.lng != null) {
      points.push([w.lng, w.lat]);
    }
  }
  if (points.length === 0) return null;

  let ring: Pt[];
  if (points.length === 1) {
    const [lng, lat] = points[0];
    ring = rectangle(lng, lng, lat, lat);
  } else if (points.length === 2) {
    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    ring = rectangle(Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats));
  } else {
    const hull = convexHull(points);
    if (hull) {
      ring = hull;
    } else {
      // colinear → fallback rectangle around the bbox
      const lngs = points.map((p) => p[0]);
      const lats = points.map((p) => p[1]);
      ring = rectangle(Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats));
    }
  }

  return {
    type: 'Feature',
    properties: { kind: 'crag-polygon' },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  };
}
