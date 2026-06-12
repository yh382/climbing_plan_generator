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
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '../../../lib/useThemeColors';
import { STYLE_COLORS } from './RoutePinCluster';
// CA-FU Phase C.2 — source switched from the legacy CragOverview (region-
// scoped, ~15k) to CragPin: the BE-classified crag-tier nodes from the 35k
// /outdoor/areas/crags preload (useAllCrags). discipline_counts.{boulder,
// rope,other} feed the same boulder_count/rope_count/unknown_count feature
// props the Mapbox expressions already read, so the whole cluster visual
// config below is unchanged.
import type { CragPin } from '../types';

/** Per-crag context attached to features so a tap surfaces full info
 *  without a second fetch.
 *
 *  BU 2026-06-07 — route_count / boulder_count widened to optional.
 *  Cross-crag wall tap (from inside another crag's browse mode) lacks
 *  these crag-level totals: wall pin metadata doesn't carry them.
 *  Callers that synthesize a partial CragPinContext from wall pin info
 *  leave them undefined; consumers use `?? 0` fallback for display.
 *  Pin-source flow (CragOverviewCluster → onCragPress) always populates
 *  both from the GroupedRecord projection. */
export type CragPinContext = {
  crag_id: string;
  crag_name: string;
  region_id: string;
  region_name: string;
  lat: number;
  lng: number;
  route_count?: number;
  boulder_count?: number;
};

export type CragOverviewClusterProps = {
  crags: CragPin[];
  styleReady: boolean;
  onCragPress: (crag: CragPin) => void;
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

const DEFAULT_MAX_ZOOM = 16;
/** CA-FU — raised 11 → 14 for the 35k dataset. Dense areas (e.g. a campus
 *  with ~35 crags packed together) kept exploding into overlapping pins at
 *  zoom 12; clustering through zoom 14 keeps them as one sized bubble until
 *  you're zoomed in enough that individual pins don't collide. */
const CLUSTER_MAX_ZOOM_LEVEL = 14;
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

// ─── CB Phase F — discover cluster composition ring ─────────────────
// A boulder/rope ratio ring drawn on cluster bubbles via a quantized set of
// pre-rendered SVG-view images + a SymbolLayer iconImage (GPU-rasterized,
// scales — MarkerView would choke on the discover crag count). Quantized to
// 11 boulder-fraction buckets (0%,10%,…,100%); `other` is folded into rope so
// the overview reads as boulder-vs-rope (the story at this zoom). Transparent
// center so the white bubble base + count text show through.
const RING_BUCKETS = 10; // → 11 images, indices 0..10
const RING_IMG = 48;
const RING_STROKE = 6;
const RING_R = (RING_IMG - RING_STROKE) / 2;
const RING_C = RING_IMG / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

function RingIcon({ boulderFraction }: { boulderFraction: number }) {
  const bLen = boulderFraction * RING_CIRC;
  return (
    <Svg width={RING_IMG} height={RING_IMG}>
      {/* full rope (blue) base ring */}
      <Circle
        cx={RING_C}
        cy={RING_C}
        r={RING_R}
        fill="none"
        stroke={STYLE_COLORS.sport}
        strokeWidth={RING_STROKE}
      />
      {/* boulder (brown) arc over the top for its fraction */}
      {boulderFraction > 0 ? (
        <Circle
          cx={RING_C}
          cy={RING_C}
          r={RING_R}
          fill="none"
          stroke={STYLE_COLORS.boulder}
          strokeWidth={RING_STROKE}
          strokeDasharray={[bLen, RING_CIRC - bLen]}
          rotation={-90}
          originX={RING_C}
          originY={RING_C}
        />
      ) : null}
    </Svg>
  );
}

const RING_INDEXES = Array.from({ length: RING_BUCKETS + 1 }, (_, i) => i);

// iconImage: pick the ring bucket from the cluster's boulder fraction
// (boulder / TOTAL — `other` folds into the rope/blue arc, so a crag with lots
// of toprope/aid doesn't over-read as boulder; guarded against /0). Step
// thresholds at the bucket midpoints (0.05, 0.15, …) round to the nearest 10%.
const RING_FRACTION_EXPR = [
  '/',
  ['get', 'boulder_count_sum'],
  ['max', 1, ['get', 'route_count_sum']],
] as const;
const RING_IMAGE_EXPR: any = ['step', RING_FRACTION_EXPR, 'crag-ring-0'];
for (let i = 1; i <= RING_BUCKETS; i++) {
  RING_IMAGE_EXPR.push((i * 10 - 5) / 100, `crag-ring-${i}`);
}

// iconSize: scale the 48px ring image down to the bubble radius
// (outer ring radius ≈ 24px), mirroring CLUSTER_RADIUS_EXPRESSION steps.
const RING_SIZE_EXPR = [
  'step',
  ['get', 'route_count_sum'],
  8 / 23,
  100, 12 / 23,
  500, 16 / 23,
  2000, 20 / 23,
  10000, 24 / 23,
] as const;

// Single-crag pin versions of the ring expressions — same ring images, driven
// by the per-feature counts (not the cluster _sum aggregates), so a single crag
// reads as a "ring of one" consistent with the cluster bubbles.
const RING_FRACTION_SINGLE = [
  '/',
  ['get', 'boulder_count'],
  ['max', 1, ['get', 'route_count']],
] as const;
const RING_IMAGE_SINGLE: any = ['step', RING_FRACTION_SINGLE, 'crag-ring-0'];
for (let i = 1; i <= RING_BUCKETS; i++) {
  RING_IMAGE_SINGLE.push((i * 10 - 5) / 100, `crag-ring-${i}`);
}
const RING_SIZE_SINGLE = [
  'step',
  ['get', 'route_count'],
  8 / 23,
  100, 12 / 23,
  500, 16 / 23,
  2000, 20 / 23,
  10000, 24 / 23,
] as const;

function toGeoJSON(crags: CragPin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: crags.map((c) => ({
      type: 'Feature',
      id: c.id,
      properties: {
        // CA-FU: `area_id` is the canonical outdoor_area id (tap → area mode).
        area_id: c.id,
        crag_name: c.name,
        route_count: c.route_count,
        // discipline_counts {boulder, rope, other} map onto the existing
        // boulder/rope/unknown feature props the cluster expressions read
        // ('other' takes the old 'unknown' slot for the dominance ratios).
        boulder_count: c.discipline_counts.boulder,
        rope_count: c.discipline_counts.rope,
        unknown_count: c.discipline_counts.other,
        // BS-P1-α — count label baked in JS (Mapbox RN drops nested
        // case+concat+round textField); shown INSIDE the single pin.
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
    const map = new Map<string, CragPin>();
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
      const cragId = props.area_id as string | undefined;
      if (!cragId) return;
      const crag = cragLookup.get(cragId);
      if (!crag) return;
      onCragPress(crag);
    },
    [cragLookup, onCragPress, onClusterPress],
  );

  if (!styleReady || shape.features.length === 0) return null;

  return (
    <>
    {/* CB Phase F — register the 11 quantized composition-ring images, shared
        by the cluster bubbles AND the single crag pins. */}
    <MapboxGL.Images>
      {RING_INDEXES.map((i) => (
        <MapboxGL.Image key={i} name={`crag-ring-${i}`}>
          <RingIcon boulderFraction={i / RING_BUCKETS} />
        </MapboxGL.Image>
      ))}
    </MapboxGL.Images>
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
        // BS-P1-ζ — boulder/rope/unknown sums for cluster-level
        // discipline ratio (powers circleColor case expression). All
        // length-2 form (operator + mapExpression) per BS Track A fix.
        boulder_count_sum: ['+', ['get', 'boulder_count']],
        rope_count_sum: ['+', ['get', 'rope_count']],
        unknown_count_sum: ['+', ['get', 'unknown_count']],
      }}
      onPress={handlePress}
      maxZoomLevel={maxZoom}
    >
      {/* Cluster bubble — muted sandstone (rope-dominant) / cool
          brown (boulder-dominant) / midpoint (mixed). Size scales
          with route density. BS-P1-ζ (2026-06-06): discipline shift
          via case expression. Falls back to default sandstone when
          unknown_ratio > 0.3 (don't mislead with sparse data). Kept
          expression shallow (handoff §10 caveat: @rnmapbox/maps RN
          version chokes on deep nesting). */}
      {/* CB Phase F — bubble is now a WHITE base; the composition ring
          (boulder/rope) is drawn on top by the iconImage SymbolLayer below,
          and the count label sits in the white center. (Was a single
          dominant-discipline fill via a case expression.) */}
      <MapboxGL.CircleLayer
        id="crag-overview-cluster-circles"
        filter={['has', 'point_count']}
        style={{
          circleColor: '#FFFFFF',
          circleOpacity: 0.96,
          circleRadius: CLUSTER_RADIUS_EXPRESSION,
          circleStrokeColor: colors.outdoorMarkerStroke,
          circleStrokeWidth: 1,
        }}
      />
      {/* CB Phase F — composition ring on the cluster bubble (boulder brown /
          rope blue), quantized image picked by boulder fraction, sized to the
          bubble. */}
      <MapboxGL.SymbolLayer
        id="crag-overview-cluster-ring"
        filter={['has', 'point_count']}
        style={{
          iconImage: RING_IMAGE_EXPR,
          iconSize: RING_SIZE_EXPR as any,
          iconAllowOverlap: true,
          iconIgnorePlacement: true,
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
          // CB Phase F — DARK text now that the bubble center is white (was
          // white-on-colored). White halo keeps it legible if it grazes the
          // ring arc.
          textColor: colors.textPrimary,
          textHaloColor: '#FFFFFF',
          textHaloWidth: 1.2,
          textAllowOverlap: true,
          textIgnorePlacement: true,
        }}
      />
      {/* Single Crag pin — visible at zoom ≥ CLUSTER_MAX_ZOOM_LEVEL+1.
          Radius + textSize scale with route_count, mirroring cluster
          bubble style so single crags read as "clusters of one" (the
          route_count printed inside the pin lets users compare crag
          sizes at a glance after zooming out of a parent cluster). */}
      {/* CB Phase F — single crag pins use STYLE_COLORS (boulder sandstone /
          routes teal-blue), consistent with browse + the cluster ring (the old
          light/dark-brown dominant shading is gone). CB Phase F — single crags
          now render the SAME composition ring as the cluster bubbles (a "ring
          of one"): white base + ring iconImage + dark count, for a unified
          look. */}
      <MapboxGL.CircleLayer
        id="crag-overview-single-pins"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: '#FFFFFF',
          circleOpacity: 0.96,
          circleRadius: SINGLE_PIN_RADIUS_EXPRESSION as any,
          circleStrokeColor: colors.outdoorMarkerStroke,
          circleStrokeWidth: 1,
        }}
      />
      {/* CB Phase F — composition ring on the single crag pin (boulder/rope). */}
      <MapboxGL.SymbolLayer
        id="crag-overview-single-ring"
        filter={['!', ['has', 'point_count']]}
        style={{
          iconImage: RING_IMAGE_SINGLE,
          iconSize: RING_SIZE_SINGLE as any,
          iconAllowOverlap: true,
          iconIgnorePlacement: true,
        }}
      />
      {/* Route count in the white center of the single crag pin (dark, like the
          cluster bubble). */}
      <MapboxGL.SymbolLayer
        id="crag-overview-single-counts"
        filter={['!', ['has', 'point_count']]}
        style={{
          textField: ['get', 'count_label'] as any,
          textSize: SINGLE_TEXT_SIZE_EXPRESSION as any,
          textColor: colors.textPrimary,
          textHaloColor: '#FFFFFF',
          textHaloWidth: 1.2,
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
        // CA-FU — only crags with >5 routes get a name label; smaller crags
        // render as pin-only. With 35k crags this is the legibility + perf
        // fix: a dense campus stops piling ~35 overlapping labels.
        filter={['all', ['!', ['has', 'point_count']], ['>', ['get', 'route_count'], 5]]}
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
          // CA-FU — false (was true) so Mapbox culls overlapping labels
          // instead of stacking them all. Combined with the >5-route filter
          // above, dense areas stay readable.
          textAllowOverlap: false,
          textIgnorePlacement: false,
          textOptional: true,
          textMaxWidth: 10,
          symbolZOrder: 'auto',
        }}
      />
    </MapboxGL.ShapeSource>
    </>
  );
}
