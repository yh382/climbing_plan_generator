// src/features/outdoor/components/TrailLayer.tsx
// Approach trail overlay for outdoor areas. Renders a dashed line from
// the area's trail_geojson (GeoJSON FeatureCollection of LineString).
// Feature properties are intentionally ignored — only the line geometry
// is drawn.
//
// BS Track B (2026-06-06) — visual provenance split:
//   - `osm` source: gray + low opacity + thin line → "reference trail,
//     NOT a verified approach". Safety/trust requirement: prevents
//     users mistaking auto-fetched OSM trails for recommended approach
//     paths (which may not actually lead to the crag, may be hiker /
//     bike / closed routes).
//   - admin / user / mixed: accent brown + bold dashed → verified
//     approach.
//   - null: nothing rendered.
//
// `lineColor` / `lineOpacity` / `lineWidth` are Mapbox paint properties
// (runtime-changeable via prop re-render). No source rebuild needed
// when trailSource flips.

import React from 'react';
import MapboxGL from '@rnmapbox/maps';

import { useThemeColors } from '../../../lib/useThemeColors';
import type { TrailFeatureCollection, TrailSource } from '../types';

const OSM_LINE_COLOR = '#9CA3AF'; // neutral gray for OSM reference trails

type TrailLayerProps = {
  trailGeoJSON: TrailFeatureCollection | null | undefined;
  trailSource?: TrailSource | null;
};

export default function TrailLayer({ trailGeoJSON, trailSource }: TrailLayerProps) {
  const colors = useThemeColors();

  if (!trailGeoJSON || !trailGeoJSON.features || trailGeoJSON.features.length === 0) {
    return null;
  }

  const isOSM = trailSource === 'osm';

  return (
    <MapboxGL.ShapeSource id="trail-src" shape={trailGeoJSON as any}>
      <MapboxGL.LineLayer
        id="trail-line"
        style={{
          lineColor: isOSM ? OSM_LINE_COLOR : colors.trail,
          lineOpacity: isOSM ? 0.5 : 0.9,
          lineWidth: isOSM ? 2 : 3,
          lineDasharray: [2, 2],
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
