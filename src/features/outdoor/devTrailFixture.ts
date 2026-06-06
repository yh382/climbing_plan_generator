// src/features/outdoor/devTrailFixture.ts
//
// Dev-only fixtures for BS Track B visual verification of TrailLayer's
// trail_source split. Prod ~100% of crag.trail_geojson is null until
// the OSM Overpass backfill (BR-Track-C-FU-(c)) runs, so without
// these fixtures the visual split is impossible to verify in dev.
//
// **Strict usage rules** (BS Track B plan §6.3 Phase 3):
//   - This file exports DATA ONLY (+ pure generator function — no
//     side effects, no React, no network calls).
//   - Callers MUST gate usage behind `__DEV__`. Metro
//     dead-code-eliminates `if (__DEV__) { ... }` branches in
//     production builds, so fixture data is unreachable in prod.
//   - Production rendering MUST NEVER substitute fixture for real
//     data when real data is present. Fallback only applies when
//     `focusedCragDetail?.trail_geojson` is null AND `__DEV__` is
//     true.
//
// Strategy: any focused crag with valid lat/lng gets a fixture trail
// generated AROUND its actual location, so dev can pick any crag in
// the map (no need to find specific "Index"/"Yosemite" names). Source
// is toggled by crag name length parity:
//   - even length → 'osm' (gray + 0.5 opacity + thin + WARNING banner)
//   - odd length  → 'user' (brown + 0.9 opacity + bold, no banner)
// Either branch exercises one of the two TrailLayer paint paths.

import type { TrailFeatureCollection, TrailSource } from './types';

export type DevTrailFallback = {
  geojson: TrailFeatureCollection;
  source: TrailSource;
};

/** Generate a wandering 7-point LineString around (lat, lng).
 *  ~500m horizontal span. Properties intentionally minimal —
 *  TrailLayer ignores them. */
function makeWanderingLine(lat: number, lng: number, kind: 'osm' | 'user'): TrailFeatureCollection {
  // OSM = winding path (jagged, "not really a direct approach")
  // user = straighter (direct approach feel)
  const offsets: Array<[number, number]> =
    kind === 'osm'
      ? [
          [0, 0],
          [0.002, 0.0015],
          [0.0005, 0.003],
          [0.0035, 0.0035],
          [0.002, 0.005],
          [0.005, 0.0055],
          [0.0045, 0.007],
        ]
      : [
          [0, 0],
          [0.001, 0.001],
          [0.002, 0.002],
          [0.003, 0.003],
          [0.004, 0.004],
        ];
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { dev: `${kind}-fixture` },
        geometry: {
          type: 'LineString',
          coordinates: offsets.map(([dLat, dLng]) => [lng + dLng, lat + dLat]),
        },
      },
    ],
  };
}

/** Dynamic fixture: ANY focused crag with valid lat/lng gets a fixture
 *  trail near its location. Toggle OSM vs user by name length parity so
 *  hot-reloading between crags shows both paint branches. Returns null
 *  only when crag lacks lat/lng (then TrailLayer falls back to "no
 *  trail" rendering, which is also a valid state to verify). */
export function getDevTrailFallback(crag: {
  name?: string | null;
  lat?: number | null;
  lng?: number | null;
} | null | undefined): DevTrailFallback | null {
  if (!crag || crag.lat == null || crag.lng == null) return null;
  const kind: 'osm' | 'user' = (crag.name?.length ?? 0) % 2 === 0 ? 'osm' : 'user';
  return {
    geojson: makeWanderingLine(crag.lat, crag.lng, kind),
    source: kind,
  };
}
