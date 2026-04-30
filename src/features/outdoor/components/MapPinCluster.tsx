// src/features/outdoor/components/MapPinCluster.tsx
// Multi-level zoom pin rendering for Mapbox: crag(blue) / sector(green) / wall(yellow).
// Each level renders three layers:
//   1. CircleLayer — colored background, radius interpolates with route_count
//   2. SymbolLayer — count number centered inside the circle (white text)
//   3. SymbolLayer — pin name label, offset below the circle

import React, { useMemo, useCallback } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { useColorScheme } from 'react-native';
import type { MapPin } from '../types';

/** Zoom thresholds matching ROADMAP_OUTDOOR.md */
const ZOOM_CRAG_MIN = 8;
const ZOOM_CRAG_MAX = 11;
const ZOOM_SECTOR_MIN = 11;
const ZOOM_SECTOR_MAX = 13;
const ZOOM_WALL_MIN = 13;
/** At very high zoom, overlay individual route pins on top of the wall
 *  pin so climbers can pick a specific route. Walls stay visible too —
 *  Mapbox z-orders the route layer above. */
const ZOOM_ROUTE_MIN = 15;

const PIN_COLORS = {
  crag: '#007AFF',   // blue
  sector: '#34C759', // green
  wall: '#FFD60A',   // yellow
  route: '#FF453A',  // red
} as const;

/** Compact radius for route pins. Deliberately smaller than crag/sector/
 *  wall pins — routes are fanned out tightly around the parent wall, so
 *  bigger circles would overlap. The grade text was also dropped (tap
 *  the dot → sheet opens with the route focused, which shows the grade). */
const ROUTE_RADIUS = 8;

/** Radius interpolates with route_count so a pin holding 1000 routes looks
 *  bigger than a pin holding 10. Values are picked to keep smaller pins
 *  readable and larger pins from overlapping on the map. */
const ADAPTIVE_RADIUS: any = [
  'interpolate',
  ['linear'],
  ['get', 'route_count'],
  0, 11,
  10, 13,
  50, 15,
  200, 17,
  1000, 20,
];

type MapPinClusterProps = {
  pins: MapPin[];
  styleReady: boolean;
  onPinPress: (pin: MapPin) => void;
};

export default function MapPinCluster({ pins, styleReady, onPinPress }: MapPinClusterProps) {
  const scheme = useColorScheme();

  const cragGeoJSON = useMemo(() => toGeoJSON(pins.filter((p) => p.level === 'crag')), [pins]);
  const sectorGeoJSON = useMemo(() => toGeoJSON(pins.filter((p) => p.level === 'sector')), [pins]);
  const wallGeoJSON = useMemo(() => toGeoJSON(pins.filter((p) => p.level === 'wall')), [pins]);
  const routeGeoJSON = useMemo(() => toGeoJSON(pins.filter((p) => p.level === 'route')), [pins]);

  const handleCragPress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => handlePress(e, pins, onPinPress),
    [pins, onPinPress],
  );
  const handleSectorPress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => handlePress(e, pins, onPinPress),
    [pins, onPinPress],
  );
  const handleWallPress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => handlePress(e, pins, onPinPress),
    [pins, onPinPress],
  );
  const handleRoutePress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => handlePress(e, pins, onPinPress),
    [pins, onPinPress],
  );

  const nameColor = scheme === 'dark' ? '#E2E8F0' : '#0F172A';
  const haloColor = scheme === 'dark' ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.85)';

  if (!styleReady) return null;

  return (
    <>
      {/* Crag pins: visible zoom 8-11 */}
      {cragGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id="outdoor-crags-src" shape={cragGeoJSON} onPress={handleCragPress}>
          <MapboxGL.CircleLayer
            id="outdoor-crags-pins"
            minZoomLevel={ZOOM_CRAG_MIN}
            maxZoomLevel={ZOOM_CRAG_MAX}
            style={{
              circleRadius: ADAPTIVE_RADIUS,
              circleColor: PIN_COLORS.crag,
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#fff',
            }}
          />
          <MapboxGL.SymbolLayer
            id="outdoor-crags-count"
            minZoomLevel={ZOOM_CRAG_MIN}
            maxZoomLevel={ZOOM_CRAG_MAX}
            style={countLabelStyle()}
          />
          <MapboxGL.SymbolLayer
            id="outdoor-crags-name"
            minZoomLevel={ZOOM_CRAG_MIN}
            maxZoomLevel={ZOOM_CRAG_MAX}
            style={nameLabelStyle(nameColor, haloColor)}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Sector pins: visible zoom 11-13 */}
      {sectorGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id="outdoor-sectors-src" shape={sectorGeoJSON} onPress={handleSectorPress}>
          <MapboxGL.CircleLayer
            id="outdoor-sectors-pins"
            minZoomLevel={ZOOM_SECTOR_MIN}
            maxZoomLevel={ZOOM_SECTOR_MAX}
            style={{
              circleRadius: ADAPTIVE_RADIUS,
              circleColor: PIN_COLORS.sector,
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#fff',
            }}
          />
          <MapboxGL.SymbolLayer
            id="outdoor-sectors-count"
            minZoomLevel={ZOOM_SECTOR_MIN}
            maxZoomLevel={ZOOM_SECTOR_MAX}
            style={countLabelStyle()}
          />
          <MapboxGL.SymbolLayer
            id="outdoor-sectors-name"
            minZoomLevel={ZOOM_SECTOR_MIN}
            maxZoomLevel={ZOOM_SECTOR_MAX}
            style={nameLabelStyle(nameColor, haloColor)}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Wall pins: visible zoom 13..15 — hand off to route-level pins
          at ZOOM_ROUTE_MIN so the two layers don't stack on the same
          geometry at max zoom (which read as "wall didn't disappear"
          visual bug). */}
      {wallGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id="outdoor-walls-src" shape={wallGeoJSON} onPress={handleWallPress}>
          <MapboxGL.CircleLayer
            id="outdoor-walls-pins"
            minZoomLevel={ZOOM_WALL_MIN}
            maxZoomLevel={ZOOM_ROUTE_MIN}
            style={{
              circleRadius: ADAPTIVE_RADIUS,
              circleColor: PIN_COLORS.wall,
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#fff',
            }}
          />
          <MapboxGL.SymbolLayer
            id="outdoor-walls-count"
            minZoomLevel={ZOOM_WALL_MIN}
            maxZoomLevel={ZOOM_ROUTE_MIN}
            style={countLabelStyle('#000')}
          />
          <MapboxGL.SymbolLayer
            id="outdoor-walls-name"
            minZoomLevel={ZOOM_WALL_MIN}
            maxZoomLevel={ZOOM_ROUTE_MIN}
            style={nameLabelStyle(nameColor, haloColor)}
          />
        </MapboxGL.ShapeSource>
      )}

      {/* Route pins: visible zoom ≥15. Small dots only, no grade label —
          the grade shows up in the sheet card that appears on tap. */}
      {routeGeoJSON.features.length > 0 && (
        <MapboxGL.ShapeSource id="outdoor-routes-src" shape={routeGeoJSON} onPress={handleRoutePress}>
          <MapboxGL.CircleLayer
            id="outdoor-routes-pins"
            minZoomLevel={ZOOM_ROUTE_MIN}
            style={{
              circleRadius: ROUTE_RADIUS,
              circleColor: PIN_COLORS.route,
              circleStrokeWidth: 1.5,
              circleStrokeColor: '#fff',
            }}
          />
        </MapboxGL.ShapeSource>
      )}
    </>
  );
}

// ---- Helpers ----

function toGeoJSON(pins: MapPin[]) {
  return {
    type: 'FeatureCollection' as const,
    features: pins.map((p) => ({
      type: 'Feature' as const,
      id: p.id,
      properties: { name: p.name, pin_id: p.id, route_count: p.route_count },
      geometry: {
        type: 'Point' as const,
        coordinates: [p.lng, p.lat],
      },
    })),
  };
}

function handlePress(
  e: { features: GeoJSON.Feature[] },
  pins: MapPin[],
  onPinPress: (pin: MapPin) => void,
) {
  const pinId = e.features?.[0]?.properties?.pin_id;
  if (!pinId) return;
  const pin = pins.find((p) => p.id === pinId);
  if (pin) onPinPress(pin);
}

/** Count label — centered inside the colored circle, white on dark pins,
 *  dark on yellow (wall) pins for contrast. */
function countLabelStyle(color: string = '#FFFFFF') {
  return {
    textField: ['to-string', ['get', 'route_count']] as any,
    textSize: 11,
    textColor: color,
    textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
    textAllowOverlap: true,
    textIgnorePlacement: true,
    // No offset — text sits exactly at the point geometry (center of circle).
  };
}

/** Pin name label — offset below the circle. */
function nameLabelStyle(textColor: string, haloColor: string) {
  return {
    textField: ['get', 'name'] as any,
    textSize: 11,
    textColor,
    textHaloColor: haloColor,
    textHaloWidth: 1.2,
    textAnchor: 'top' as const,
    textOffset: [0, 1.3] as [number, number],
    textJustify: 'center' as const,
    textAllowOverlap: false,
    textIgnorePlacement: false,
    textPadding: 4,
    textMaxWidth: 10,
    symbolZOrder: 'auto' as const,
  };
}
