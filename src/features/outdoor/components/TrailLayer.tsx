// src/features/outdoor/components/TrailLayer.tsx
// Approach trail overlay for outdoor areas. Renders a dashed earth-tone
// line from the area's trail_geojson (GeoJSON FeatureCollection of
// LineString). Feature properties are intentionally ignored — only the
// line geometry is drawn.

import React from 'react';
import MapboxGL from '@rnmapbox/maps';

import { useThemeColors } from '../../../lib/useThemeColors';
import type { TrailFeatureCollection } from '../types';

type TrailLayerProps = {
  trailGeoJSON: TrailFeatureCollection | null | undefined;
};

export default function TrailLayer({ trailGeoJSON }: TrailLayerProps) {
  const colors = useThemeColors();

  if (!trailGeoJSON || !trailGeoJSON.features || trailGeoJSON.features.length === 0) {
    return null;
  }

  return (
    <MapboxGL.ShapeSource id="trail-src" shape={trailGeoJSON as any}>
      <MapboxGL.LineLayer
        id="trail-line"
        style={{
          lineColor: colors.trail,
          lineWidth: 3,
          lineDasharray: [2, 2],
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
