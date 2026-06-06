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
import { theme } from '../../../lib/theme';
import type { CragOverview } from '../types';

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
 *  `route_count_sum` aggregated across the cluster's child crags. */
const CLUSTER_RADIUS_EXPRESSION = [
  'step',
  ['get', 'route_count_sum'],
  16,    // <100 routes
  100, 22,    // ≥100
  500, 28,    // ≥500
  2000, 34,   // ≥2000
  10000, 42,  // ≥10000
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
      clusterProperties={{
        route_count_sum: ['+', ['accumulated'], ['get', 'route_count_sum']],
      }}
      onPress={handlePress}
      maxZoomLevel={maxZoom}
    >
      {/* Cluster bubble — orange circle, size scales with route density */}
      <MapboxGL.CircleLayer
        id="crag-overview-cluster-circles"
        filter={['has', 'point_count']}
        style={{
          circleColor: theme.colors.accent,
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
          circleColor: theme.colors.accent,
          circleRadius: SINGLE_PIN_RADIUS,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.4,
        }}
      />
      {/* Single Crag name label — appears at zoom 11+ when single pins
          visible. Matches the working gym-labels style verbatim
          (textVariableAnchor + textRadialOffset) since `textAnchor +
          textOffset` combination caused makeLayer to return nil. */}
      <MapboxGL.SymbolLayer
        id="crag-overview-single-labels"
        filter={['!', ['has', 'point_count']]}
        minZoomLevel={11}
        style={{
          textField: ['get', 'crag_name'] as any,
          textSize: 11,
          textColor: '#0F172A',
          textHaloColor: 'rgba(255,255,255,0.92)',
          textHaloWidth: 1.4,
          textVariableAnchor: ['top', 'bottom', 'left', 'right'],
          textRadialOffset: 1.0,
          textJustify: 'auto',
          textAllowOverlap: false,
          textIgnorePlacement: false,
          textPadding: 6,
          textMaxWidth: 10,
          symbolZOrder: 'auto',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
