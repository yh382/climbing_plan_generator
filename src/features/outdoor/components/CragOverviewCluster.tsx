/**
 * CragOverviewCluster — BR Track D Day 7 follow-up tier-1 map source.
 *
 * Replaces the legacy Region-overview + bbox-shifting RoutePinCluster in
 * explore mode (PLAN §3.2 redesign per 2026-06-06 dogfood feedback). Loads
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
import { useThemeColors } from '../../../lib/useThemeColors';
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
  /** BS-P1-ε importance-by-zoom filter. Hide crags with
   *  route_count below this threshold so low-zoom views show only
   *  significant climbing destinations (less noise). Caller derives
   *  from camera zoom (see getMinRoutesForZoom in MapScreenMapbox).
   *  Defaults to 0 (show all). */
  minRoutes?: number;
};

/** Importance-by-zoom tier table. Returns the minimum
 *  `route_count` a crag must have to render at the given zoom.
 *  Threshold is intentionally moderate (not extreme) so sparse
 *  climbing regions still show as small clusters — gives users a
 *  density "dust" cue across the map rather than only flagship
 *  destinations. Mapbox supercluster aggregates sparse features
 *  into smaller cluster bubbles naturally. */
export function getMinRoutesForZoom(zoom: number): number {
  if (zoom < 6) return 200;
  if (zoom < 8) return 60;
  if (zoom < 10) return 20;
  if (zoom < 12) return 5;
  return 0;
}

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

// Text size mirrors the radius step (≈ radius × 0.7) so text-to-bubble
// ratio stays visually consistent across all cluster sizes — small
// bubble had previously fit "640" with 12pt looking cramped; large
// bubble had "5.4k" looking lost. Steps align 1:1 with
// CLUSTER_RADIUS_EXPRESSION breakpoints.
const CLUSTER_TEXT_SIZE_EXPRESSION = [
  'step',
  ['get', 'route_count_sum'],
  9,     // <100   → radius 8  → text 9pt
  100, 11,    // ≥100   → radius 12 → text 11pt
  500, 13,    // ≥500   → radius 16 → text 13pt
  2000, 15,   // ≥2000  → radius 20 → text 15pt
  10000, 17,  // ≥10000 → radius 24 → text 17pt
] as const;

// Single crag pin radius mirrors cluster bubble scale (route count
// based) so individual crags read as "1-route clusters" — visually
// consistent with cluster bubbles, and large enough to fit the route
// count text inside the pin. Same step breakpoints as cluster.
const SINGLE_PIN_RADIUS_EXPRESSION = [
  'step',
  ['get', 'route_count'],
  8,     // <100   → radius 8
  100, 12,    // ≥100   → radius 12
  500, 16,    // ≥500   → radius 16
  2000, 20,   // ≥2000  → radius 20
  10000, 24,  // ≥10000 → radius 24
] as const;

const SINGLE_TEXT_SIZE_EXPRESSION = [
  'step',
  ['get', 'route_count'],
  9,     // <100   → text 9pt
  100, 11,    // ≥100   → text 11pt
  500, 13,    // ≥500   → text 13pt
  2000, 15,   // ≥2000  → text 15pt
  10000, 17,  // ≥10000 → text 17pt
] as const;

/** Compact route count: ≥10000→"Xk" (no decimal); 1000-9999→"X.Xk"
 *  (1 decimal); <1000→raw. Same rule as cluster bubble. */
function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}

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
        // BS-P1-α (2026-06-06) — pre-computed display strings in JS
        // rather than deeply nested Mapbox expressions (Mapbox RN
        // silently drops case+concat+round+division textField — see
        // handoff §10). `count_label` goes INSIDE the single-pin
        // circle (cluster-bubble-like visual), `crag_name` is shown
        // below the pin (existing name label).
        count_label: c.route_count > 0 ? formatCount(c.route_count) : '',
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
  minRoutes = 0,
}: CragOverviewClusterProps) {
  const colors = useThemeColors();
  // BS-P1-ε — filter low-importance crags before clustering. We filter
  // at source data level (not Mapbox layer filter) so cluster math
  // respects the filter — Mapbox layer filters apply after cluster
  // aggregation, so they would only hide post-cluster features.
  const shape = useMemo(() => {
    const filtered = minRoutes > 0
      ? crags.filter((c) => (c.route_count ?? 0) >= minRoutes)
      : crags;
    return toGeoJSON(filtered);
  }, [crags, minRoutes]);

  // Lookup intentionally indexes the UNFILTERED crags array so tap
  // handlers can still resolve a crag id even if the importance
  // filter (BS-P1-ε) hid it from the source. Don't "optimize" by
  // reusing the filtered shape.
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
      {/* Cluster bubble — muted sandstone fill + sandstone stroke
          (BS-P1-η softer palette). Size scales with route density. */}
      <MapboxGL.CircleLayer
        id="crag-overview-cluster-circles"
        filter={['has', 'point_count']}
        style={{
          circleColor: colors.outdoorMarkerFill,
          circleOpacity: Number(colors.markerOpacity),
          circleRadius: CLUSTER_RADIUS_EXPRESSION,
          circleStrokeColor: colors.outdoorMarkerStroke,
          circleStrokeWidth: 2,
        }}
      />
      {/* Cluster bubble label — total route count across the cluster's
          child crags (more informative for climbers than crag-count).
          BS-P1-α (2026-06-06): abbreviate ≥1000 to "Xk" / "X.Xk" so
          large clusters (e.g. 24581) don't bloat the bubble. Direct
          interpretation per user: "10k" / "2k" reads as route count
          without needing a "climbs" suffix; the upcoming Boulder/Rope
          composition ring (BS-P1-ζ) will visually disambiguate. No
          `textFont` — DIN Pro Bold previously caused font-lookup
          failures on the loaded outdoor-v12 style. */}
      <MapboxGL.SymbolLayer
        id="crag-overview-cluster-labels"
        filter={['has', 'point_count']}
        style={{
          textField: [
            'case',
            // ≥10000 → round to "Xk" (no decimal, e.g. 24581→25k, 12792→13k)
            ['>=', ['get', 'route_count_sum'], 10000],
            [
              'concat',
              ['to-string', ['round', ['/', ['get', 'route_count_sum'], 1000]]],
              'k',
            ],
            // 1000–9999 → "X.Xk" (1 decimal max, e.g. 1383→1.4k, 5247→5.2k)
            // round(value/100)/10 to avoid number-format options being
            // ignored by @rnmapbox/maps (which defaults to 3 decimals).
            ['>=', ['get', 'route_count_sum'], 1000],
            [
              'concat',
              ['to-string', ['/', ['round', ['/', ['get', 'route_count_sum'], 100]], 10]],
              'k',
            ],
            // <1000 → raw "640"
            ['to-string', ['get', 'route_count_sum']],
          ] as any,
          textSize: CLUSTER_TEXT_SIZE_EXPRESSION as any,
          textColor: colors.outdoorMarkerText,
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />
      {/* Single Crag pin — visible at zoom ≥ CLUSTER_MAX_ZOOM_LEVEL+1.
          Radius + textSize scale with route_count, mirroring cluster
          bubble style so single crags read as "clusters of one" (the
          route_count printed inside the pin lets users compare crag
          sizes at a glance after zooming out of a parent cluster). */}
      <MapboxGL.CircleLayer
        id="crag-overview-single-pins"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: colors.outdoorMarkerFill,
          circleOpacity: Number(colors.markerOpacity),
          circleRadius: SINGLE_PIN_RADIUS_EXPRESSION as any,
          circleStrokeColor: colors.outdoorMarkerStroke,
          circleStrokeWidth: 2,
        }}
      />
      {/* Route count INSIDE the single crag pin (white text on orange
          circle). Mirrors cluster bubble's count label. */}
      <MapboxGL.SymbolLayer
        id="crag-overview-single-counts"
        filter={['!', ['has', 'point_count']]}
        style={{
          textField: ['get', 'count_label'] as any,
          textSize: SINGLE_TEXT_SIZE_EXPRESSION as any,
          textColor: colors.outdoorMarkerText,
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />
      {/* Single Crag name label — always visible alongside the single
          pin (no separate minZoom; tied to same filter as single-pins
          so it appears the moment the cluster dissolves). Forced
          textAllowOverlap + textIgnorePlacement so every visible pin
          shows its name, even in dense areas (Yosemite-style). User
          requirement 2026-06-06 — "label should follow the pin, not
          appear at a special zoom". Count moved INSIDE the pin
          (crag-overview-single-counts), so this label is now name
          only. textOffset increased to clear the larger
          route-count-scaled pin radius (up to 24px). */}
      <MapboxGL.SymbolLayer
        id="crag-overview-single-labels"
        filter={['!', ['has', 'point_count']]}
        style={{
          textField: ['get', 'crag_name'] as any,
          // BS-P1-η label visual system — softer outdoor palette,
          // zoom-interpolated size, Medium weight (was Bold) for
          // less debug-overlay feel.
          textSize: [
            'interpolate', ['linear'], ['zoom'],
            8, 11,
            11, 12,
            14, 13.5,
          ] as any,
          textColor: colors.outdoorLabelText,
          textHaloColor: colors.outdoorLabelHalo,
          textHaloWidth: 1.5,
          textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          textAnchor: 'top',
          // Offset clears the route-count-scaled pin (radius up to 24px).
          textOffset: [0, 2.4],
          textAllowOverlap: true,
          textIgnorePlacement: true,
          textMaxWidth: 10,
          symbolZOrder: 'auto',
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
