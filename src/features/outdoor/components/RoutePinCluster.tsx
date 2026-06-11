/**
 * RoutePinCluster — bbox-driven Mapbox cluster source.
 *
 * CA Phase 6.2 — renamed from WallPinContext to AreaPinContext. UX
 * concept of "wall pin" stays (zoom ≥15 dissolves clusters into single
 * pins for each leaf-level area), but the data layer speaks in
 * canonical outdoor_area UUIDs exclusively:
 *  - BE RoutePin slimmed to {area_id, area_name, display_kind, lat, lng,
 *    discipline, style} (was 7-column 4-level ancestor chain).
 *  - FE groups by `area_id` to enforce the single-pin invariant.
 *  - Pin tap surfaces `AreaPinContext.area_id` to the caller; caller
 *    hydrates ancestor breadcrumb via `/outdoor/areas/{id}` if needed.
 *
 * Single ShapeSource with `cluster:true`; uniform `theme.colors.accent`
 * orange (filter chips do discipline segmentation, not color).
 */
import { useCallback, useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { theme } from '../../../lib/theme';
import type { RoutePin } from '../types';

/** Per-area aggregated context attached to features so a tap surfaces
 *  the canonical UUID without a second fetch. CA Phase 6.2 — primary
 *  field is `area_id` (the canonical outdoor_area UUID for the pin's
 *  parent area). Legacy aliases (`wall_id` / `crag_id` / `region_id`
 *  and their name pairs) are all filled with the SAME values
 *  (area_id / area_name) as a compat shim so the existing MapScreenMapbox
 *  state machine — which still thinks in 4-level terms — keeps working
 *  without a deep refactor. Real ancestor breadcrumb hydrates via
 *  `/outdoor/areas/{area_id}` when the sheet presents.
 *  Follow-up (Phase 6.2-FU): collapse these aliases once the state
 *  machine speaks only in canonical area_id terms. */
export type AreaPinContext = {
  area_id: string;
  area_name: string;
  display_kind: string;
  /** Centroid lat/lng of the routes grouped under this area. */
  lat: number;
  lng: number;
  /** Number of routes attached to this area in the current bbox. */
  route_count: number;
};
// CA-FU Phase D — the 6 legacy ancestor aliases (wall_id / crag_id /
// region_id + names) + the WallPinContext alias removed; no caller reads
// them post wall-state-machine removal.

export type RoutePinClusterProps = {
  pins: RoutePin[];
  styleReady: boolean;
  onAreaPress?: (ctx: AreaPinContext) => void;
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

const AREA_PIN_RADIUS = 8;

/** Pre-group RoutePin[] by area_id. Output is one Feature per area,
 *  with the area context attached as properties so tap handlers can
 *  recover canonical UUID + label. Lat/lng = centroid of the grouped
 *  routes. */
function groupByArea(pins: RoutePin[]): AreaPinContext[] {
  const buckets = new Map<string, { sumLat: number; sumLng: number; count: number; ctx: Omit<AreaPinContext, 'lat' | 'lng' | 'route_count'> }>();
  for (const p of pins) {
    const existing = buckets.get(p.area_id);
    if (existing) {
      existing.sumLat += p.lat;
      existing.sumLng += p.lng;
      existing.count += 1;
    } else {
      buckets.set(p.area_id, {
        sumLat: p.lat,
        sumLng: p.lng,
        count: 1,
        ctx: {
          area_id: p.area_id,
          area_name: p.area_name,
          display_kind: p.display_kind,
        },
      });
    }
  }
  const out: AreaPinContext[] = [];
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

function toGeoJSON(areas: AreaPinContext[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map((a) => ({
      type: 'Feature',
      id: a.area_id,
      properties: {
        area_id: a.area_id,
        area_name: a.area_name,
        display_kind: a.display_kind,
        route_count: a.route_count,
      },
      geometry: {
        type: 'Point',
        coordinates: [a.lng, a.lat],
      },
    })),
  };
}

export default function RoutePinCluster({
  pins,
  styleReady,
  onAreaPress,
  onClusterPress,
}: RoutePinClusterProps) {
  const tapHandler = onAreaPress;
  const areaContexts = useMemo(() => groupByArea(pins), [pins]);
  const shape = useMemo(() => toGeoJSON(areaContexts), [areaContexts]);
  const areaLookup = useMemo(() => {
    const map = new Map<string, AreaPinContext>();
    for (const a of areaContexts) map.set(a.area_id, a);
    return map;
  }, [areaContexts]);

  const handlePress = useCallback(
    (e: { features: GeoJSON.Feature[]; coordinates?: { latitude: number; longitude: number } }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const props = feature.properties ?? {};
      // Cluster bubbles carry `cluster: true` + `point_count`; individual
      // features carry our area_id property.
      if (props.cluster) {
        const geom = feature.geometry;
        if (geom?.type === 'Point') {
          const coords = geom.coordinates as [number, number];
          onClusterPress(coords);
        }
        return;
      }
      const areaId = props.area_id as string | undefined;
      if (!areaId) return;
      const ctx = areaLookup.get(areaId);
      if (ctx && tapHandler) tapHandler(ctx);
    },
    [areaLookup, tapHandler, onClusterPress],
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
      {/* Single area pin — visible at zoom ≥15+ when clusters dissolve. */}
      <MapboxGL.CircleLayer
        id="outdoor-route-pins-single"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: theme.colors.accent,
          circleRadius: AREA_PIN_RADIUS,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.2,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
