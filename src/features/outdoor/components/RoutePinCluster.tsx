/**
 * RoutePinCluster — BR Track D Day 5 map cluster source.
 *
 * Replaces the multi-level `MapPinCluster` per PLAN_OUTDOOR_MAP_UX_V2 §2:
 *  - Single Mapbox ShapeSource with `cluster: true`
 *  - Uniform `theme.colors.accent` orange (PLAN §2.3 — drop boulder/rope split;
 *    filter chips do type segmentation)
 *  - Source data: pre-grouped by `wall_id` client-side so a wall with N
 *    routes collapses to ONE single Wall pin at zoom ≥15 (PLAN §2.2's
 *    "single Wall pin" invariant). Mapbox cluster:true then aggregates
 *    those Wall pins into bubbles at lower zooms.
 *
 * Pin tap:
 *  - Cluster bubble  → `onClusterPress(coords)` — caller flies camera in
 *  - Single Wall pin → `onWallPress(wallContext)` with the ancestor chain
 *    so caller can open RoutesListSheet focused on that wall.
 *
 * Day 5a delivery: new file only. Day 5b wires it into MapScreenMapbox in
 * place of MapPinCluster, and removes the legacy multi-level layers.
 */
import { useCallback, useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { theme } from '../../../lib/theme';
import type { RoutePin } from '../types';

/** Per-wall aggregated context attached to features so a tap surfaces the
 *  full ancestor chain without a second fetch. */
export type WallPinContext = {
  wall_id: string;
  wall_name: string;
  crag_id: string;
  crag_name: string;
  area_id: string;
  area_name: string;
  region_id: string;
  region_name: string;
  /** Centroid lat/lng of the routes grouped under this wall. */
  lat: number;
  lng: number;
  /** Number of routes attached to this wall in the current bbox. */
  route_count: number;
};

export type RoutePinClusterProps = {
  pins: RoutePin[];
  styleReady: boolean;
  onWallPress: (ctx: WallPinContext) => void;
  /** When the user taps a cluster bubble, fly camera in. The caller knows
   *  how to compute the next zoom from `getClusterExpansionZoom`. */
  onClusterPress: (coords: [number, number]) => void;
};

/** PLAN §2.2: clusters dissolve at 15+. clusterMaxZoomLevel is the
 *  correct Mapbox v10 prop name on @rnmapbox/maps@10.1.45. */
const CLUSTER_MAX_ZOOM_LEVEL = 14;
/** Pixel radius for cluster aggregation — 50px gives comfortable density
 *  on iPhone screens without over-collapsing distinct walls. */
const CLUSTER_RADIUS = 50;

/** Adaptive size for the cluster circle so dense areas read as visually
 *  weightier without overwhelming the map. */
const CLUSTER_RADIUS_EXPRESSION = [
  'step',
  ['get', 'point_count'],
  14,   // < 10 routes
  10, 18,   // ≥ 10
  50, 22,   // ≥ 50
  250, 28,  // ≥ 250
  1000, 34, // ≥ 1000
] as const;

const WALL_PIN_RADIUS = 8;

/** Pre-group RoutePin[] by wall_id. Output is one Feature per wall, with
 *  the wall context attached as properties so tap handlers can recover
 *  the ancestor chain. Lat/lng = centroid of the grouped routes. */
function groupByWall(pins: RoutePin[]): WallPinContext[] {
  const buckets = new Map<string, { sumLat: number; sumLng: number; count: number; ctx: Omit<WallPinContext, 'lat' | 'lng' | 'route_count'> }>();
  for (const p of pins) {
    const existing = buckets.get(p.wall_id);
    if (existing) {
      existing.sumLat += p.lat;
      existing.sumLng += p.lng;
      existing.count += 1;
    } else {
      buckets.set(p.wall_id, {
        sumLat: p.lat,
        sumLng: p.lng,
        count: 1,
        ctx: {
          wall_id: p.wall_id,
          wall_name: p.wall_name,
          crag_id: p.crag_id,
          crag_name: p.crag_name,
          area_id: p.area_id,
          area_name: p.area_name,
          region_id: p.region_id,
          region_name: p.region_name,
        },
      });
    }
  }
  const out: WallPinContext[] = [];
  for (const { sumLat, sumLng, count, ctx } of buckets.values()) {
    out.push({
      ...ctx,
      lat: sumLat / count,
      lng: sumLng / count,
      route_count: count,
    });
  }
  return out;
}

function toGeoJSON(walls: WallPinContext[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: walls.map((w) => ({
      type: 'Feature',
      id: w.wall_id,
      properties: {
        wall_id: w.wall_id,
        wall_name: w.wall_name,
        crag_id: w.crag_id,
        crag_name: w.crag_name,
        area_id: w.area_id,
        area_name: w.area_name,
        region_id: w.region_id,
        region_name: w.region_name,
        route_count: w.route_count,
      },
      geometry: {
        type: 'Point',
        coordinates: [w.lng, w.lat],
      },
    })),
  };
}

export default function RoutePinCluster({
  pins,
  styleReady,
  onWallPress,
  onClusterPress,
}: RoutePinClusterProps) {
  const wallContexts = useMemo(() => groupByWall(pins), [pins]);
  const shape = useMemo(() => toGeoJSON(wallContexts), [wallContexts]);
  const wallLookup = useMemo(() => {
    const map = new Map<string, WallPinContext>();
    for (const w of wallContexts) map.set(w.wall_id, w);
    return map;
  }, [wallContexts]);

  const handlePress = useCallback(
    (e: { features: GeoJSON.Feature[]; coordinates?: { latitude: number; longitude: number } }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties ?? {};
      // Cluster bubbles carry `cluster: true` + `point_count`; individual
      // features carry our wall_id property.
      if (props.cluster) {
        const geom = feature.geometry;
        if (geom?.type === 'Point') {
          const coords = geom.coordinates as [number, number];
          onClusterPress(coords);
        }
        return;
      }
      const wallId = props.wall_id as string | undefined;
      if (!wallId) return;
      const ctx = wallLookup.get(wallId);
      if (ctx) onWallPress(ctx);
    },
    [wallLookup, onWallPress, onClusterPress],
  );

  if (!styleReady || shape.features.length === 0) return null;

  return (
    <MapboxGL.ShapeSource
      id="outdoor-route-pins-src"
      shape={shape}
      cluster
      clusterMaxZoomLevel={CLUSTER_MAX_ZOOM_LEVEL}
      clusterRadius={CLUSTER_RADIUS}
      onPress={handlePress}
    >
      {/* Cluster bubble — circle + centered count label. */}
      <MapboxGL.CircleLayer
        id="outdoor-route-pins-clusters"
        filter={['has', 'point_count']}
        style={{
          circleColor: theme.colors.accent,
          circleRadius: CLUSTER_RADIUS_EXPRESSION,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.4,
        }}
      />
      <MapboxGL.SymbolLayer
        id="outdoor-route-pins-cluster-count"
        filter={['has', 'point_count']}
        style={{
          textField: ['get', 'point_count_abbreviated'] as any,
          textSize: 12,
          textColor: '#FFFFFF',
          textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />
      {/* Single Wall pin — visible at zoom ≥15+ when clusters dissolve. */}
      <MapboxGL.CircleLayer
        id="outdoor-route-pins-wall"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: theme.colors.accent,
          circleRadius: WALL_PIN_RADIUS,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.2,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
