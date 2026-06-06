/**
 * CragOverviewCluster — BR Track D Day 7 follow-up tier-1 map source.
 *
 * Replaces the legacy Region-overview + bbox-shifting RoutePinCluster in
 * gyms mode (PLAN §3.2 redesign per 2026-06-06 dogfood feedback). Loads
 * ~15k Crags **once** via `useCragsOverview` hook; Mapbox `cluster:true`
 * handles zoom-level aggregation client-side. Source is stable across
 * pan/zoom so cluster positions don't shift — matches Apple Maps /
 * Strava / AllTrails industry standard for hierarchical POI data.
 *
 * Tap behavior:
 *  - Cluster bubble  → `onClusterPress(coords)` — caller flies camera in
 *  - Single Crag pin → `onCragPress(cragContext)` — caller presents
 *    CragInfoSheet stacked
 *
 * Cluster bubble label = sum of `route_count` across crags in the
 * cluster (via Mapbox `clusterProperties` aggregate expression).
 */
import { useCallback, useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import type { CragOverview } from '../types';

// BS Track A 2026-06-06 — outdoor cluster orange, visually distinct
// from the teal accent (#306E6F) used by gym cluster. User explicitly
// required "orange like the fruit". Hard-coded for now; should migrate
// to a `theme.colors.outdoorMarker` token in a BS follow-up so dark
// mode can pick a brighter variant if needed.
const OUTDOOR_MARKER_ORANGE = '#F97316';

/** Per-crag context attached to features so a tap surfaces full info
 *  without a second fetch. */
export type CragPinContext = {
  crag_id: string;
  crag_name: string;
  region_id: string;
  region_name: string;
  lat: number;
  lng: number;
  route_count: number;
  boulder_count: number;
};

export type CragOverviewClusterProps = {
  crags: CragOverview[];
  styleReady: boolean;
  onCragPress: (ctx: CragPinContext) => void;
  /** Tap cluster bubble → caller flies camera in (e.g. +2 zoom). */
  onClusterPress: (coords: [number, number]) => void;
  /** Switch off at zoom ≥ this to avoid stacking with the area-mode
   *  bbox RoutePinCluster. Default 13: tier-1 fades out before tier-2
   *  takes over. */
  maxZoom?: number;
};

const DEFAULT_MAX_ZOOM = 13;
/** PLAN §3.2 — clusters dissolve before our crag pins themselves go
 *  away. At zoom 11+ individual Crag dots are visible; at 13+ user
 *  should drill into area mode via tap. */
const CLUSTER_MAX_ZOOM_LEVEL = 11;
const CLUSTER_RADIUS = 50;

/** Adaptive cluster bubble size — denser climbing regions render bigger
 *  so visual weight tracks route density at a glance. Driven by total
 *  `route_count_sum` aggregated across the cluster's child crags.
 *  Scale aligned with gym cluster (max 26) — keeps bubbles legible at
 *  continental zoom without occluding underlying geography. Outdoor
 *  numbers span 10k+ so max step is slightly larger than gym. */
const CLUSTER_RADIUS_EXPRESSION = [
  'step',
  ['get', 'route_count_sum'],
  8,     // <100 routes
  100, 12,    // ≥100
  500, 16,    // ≥500
  2000, 20,   // ≥2000
  10000, 24,  // ≥10000
] as const;

const SINGLE_PIN_RADIUS = 7;

function toGeoJSON(crags: CragOverview[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: crags.map((c) => ({
      type: 'Feature',
      id: c.id,
      properties: {
        crag_id: c.id,
        crag_name: c.name,
        region_id: c.region_id,
        region_name: c.region_name,
        route_count: c.route_count,
        boulder_count: c.boulder_count,
      },
      geometry: {
        type: 'Point',
        coordinates: [c.lng, c.lat],
      },
    })),
  };
}

export default function CragOverviewCluster({
  crags,
  styleReady,
  onCragPress,
  onClusterPress,
  maxZoom = DEFAULT_MAX_ZOOM,
}: CragOverviewClusterProps) {
  const shape = useMemo(() => toGeoJSON(crags), [crags]);

  const cragLookup = useMemo(() => {
    const map = new Map<string, CragOverview>();
    for (const c of crags) map.set(c.id, c);
    return map;
  }, [crags]);

  const handlePress = useCallback(
    (e: {
      features: GeoJSON.Feature[];
      coordinates?: { latitude: number; longitude: number };
    }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties ?? {};
      // Cluster bubble vs single pin discriminator
      if (props.cluster) {
        const geom = feature.geometry;
        if (geom?.type === 'Point') {
          onClusterPress(geom.coordinates as [number, number]);
        }
        return;
      }
      const cragId = props.crag_id as string | undefined;
      if (!cragId) return;
      const crag = cragLookup.get(cragId);
      if (!crag) return;
      onCragPress({
        crag_id: crag.id,
        crag_name: crag.name,
        region_id: crag.region_id,
        region_name: crag.region_name,
        lat: crag.lat,
        lng: crag.lng,
        route_count: crag.route_count,
        boulder_count: crag.boulder_count,
      });
    },
    [cragLookup, onCragPress, onClusterPress],
  );

  if (!styleReady || shape.features.length === 0) return null;

  return (
    <MapboxGL.ShapeSource
      id="crag-overview-src"
      shape={shape}
      cluster
      clusterMaxZoomLevel={CLUSTER_MAX_ZOOM_LEVEL}
      clusterRadius={CLUSTER_RADIUS}
      // Mapbox aggregate: sum of child crag.route_count per cluster.
      // Bubble label below reads this property.
      // BS Track A fix 2026-06-06: @rnmapbox/maps clusterProperties
      // strictly requires length-2 array [operator, mapExpression] —
      // length-3 form (with explicit ['accumulated']) fails source
      // addToMap with "must be an array with length of 2". Also the
      // map expression must read a property that exists on base
      // features — child crag features emit `route_count`, never
      // `route_count_sum` (that's the aggregated output name, not an
      // input). Previous expression `['+', ['accumulated'], ['get',
      // 'route_count_sum']]` had both bugs; this was the real Track A
      // root cause (broken source → every layer's find_source nil →
      // outdoor cluster + pins entirely invisible).
      clusterProperties={{
        route_count_sum: ['+', ['get', 'route_count']],
      }}
      onPress={handlePress}
      maxZoomLevel={maxZoom}
    >
      {/* Cluster bubble — orange circle, size scales with route density */}
      <MapboxGL.CircleLayer
        id="crag-overview-cluster-circles"
        filter={['has', 'point_count']}
        style={{
          circleColor: OUTDOOR_MARKER_ORANGE,
          circleRadius: CLUSTER_RADIUS_EXPRESSION,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.6,
          circleOpacity: 0.92,
        }}
      />
      {/* Cluster bubble label — total route count across the cluster's
          child crags (more informative for climbers than crag-count).
          Uses `to-string` on the aggregated `route_count_sum` clusterProperty
          — kept simple to avoid the layer-makeLayer-nil failure that
          nested case/concat expressions caused on this @rnmapbox/maps
          version. No `textFont` (defaults work; DIN Pro Bold caused
          font-lookup failures on the loaded outdoor-v12 style). */}
      <MapboxGL.SymbolLayer
        id="crag-overview-cluster-labels"
        filter={['has', 'point_count']}
        style={{
          textField: ['to-string', ['get', 'route_count_sum']] as any,
          textSize: 12,
          textColor: '#FFFFFF',
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />
      {/* Single Crag pin — visible at zoom ≥ CLUSTER_MAX_ZOOM_LEVEL+1 */}
      <MapboxGL.CircleLayer
        id="crag-overview-single-pins"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: OUTDOOR_MARKER_ORANGE,
          circleRadius: SINGLE_PIN_RADIUS,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.4,
        }}
      />
      {/* Single Crag name label — always visible alongside the single
          pin (no separate minZoom; tied to same filter as single-pins
          so it appears the moment the cluster dissolves). Forced
          textAllowOverlap + textIgnorePlacement so every visible pin
          shows its name, even in dense areas (Yosemite-style). User
          requirement 2026-06-06 — "label should follow the pin, not
          appear at a special zoom". */}
      <MapboxGL.SymbolLayer
        id="crag-overview-single-labels"
        filter={['!', ['has', 'point_count']]}
        style={{
          textField: ['get', 'crag_name'] as any,
          textSize: 11,
          textColor: '#0F172A',
          textHaloColor: 'rgba(255,255,255,0.92)',
          textHaloWidth: 1.4,
          textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          textAnchor: 'top',
          textOffset: [0, 0.8],
          textAllowOverlap: true,
          textIgnorePlacement: true,
          textMaxWidth: 10,
          symbolZOrder: 'auto',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
