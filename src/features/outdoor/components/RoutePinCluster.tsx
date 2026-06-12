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
 * Single ShapeSource with `cluster:true`. CB 点2 — single pins are now
 * 2-color by dominant discipline: sandstone (`outdoorMarkerFill`) for
 * boulder-dominant areas, teal-blue (`routesMarkerFill`) for rope-dominant
 * ("Routes") areas, so discipline reads at a glance. Cluster bubbles (only
 * at zoom ≤10, far out) stay sandstone — they aggregate many areas, so a
 * single 2-color verdict isn't meaningful there. (Phase F upgrades the
 * single pin to a boulder/sport/trad ratio ring.)
 */
import { useCallback, useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { theme } from '../../../lib/theme';
import type { AreaComposition, RoutePin } from '../types';

/** CB Phase F — 4-bucket style palette, shared with the donut so dots, rings,
 *  and the legend all read the same. Boulder/sport reuse the pin colors; trad
 *  green + other grey are device-tunable. */
export const STYLE_COLORS = {
  boulder: theme.colors.outdoorMarkerFill, // sandstone
  sport: theme.colors.routesMarkerFill, // teal-blue
  trad: '#5E8C61', // muted green
  other: '#9AA0A6', // grey
} as const;

type StyleBucket = keyof typeof STYLE_COLORS;

/** Dominant style bucket (argmax; ties resolve boulder>sport>trad>other). */
export function dominantStyle(c: AreaComposition): StyleBucket {
  const entries: [StyleBucket, number][] = [
    ['boulder', c.boulder],
    ['sport', c.sport],
    ['trad', c.trad],
    ['other', c.other],
  ];
  let best = entries[0];
  for (const e of entries) if (e[1] > best[1]) best = e;
  return best[0];
}

/** ≥2 non-empty buckets → the area is "mixed" and warrants a ratio ring. */
export function isMix(c: AreaComposition): boolean {
  return (
    (c.boulder > 0 ? 1 : 0) +
      (c.sport > 0 ? 1 : 0) +
      (c.trad > 0 ? 1 : 0) +
      (c.other > 0 ? 1 : 0) >=
    2
  );
}

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
  /** How many of those are boulders. CB 点2 — drives the 2-color fill
   *  (boulder-dominant → sandstone, else teal-blue "Routes"). Phase F will
   *  carry the full sport/trad split here for the ratio ring. */
  boulder_count: number;
};
// CA-FU Phase D — the 6 legacy ancestor aliases (wall_id / crag_id /
// region_id + names) + the WallPinContext alias removed; no caller reads
// them post wall-state-machine removal.

export type RoutePinClusterProps = {
  pins: RoutePin[];
  styleReady: boolean;
  /** CB 点3b — area_id of the focused crag; its single pin gets a highlight
   *  halo so the user can find it after tapping its card / pin. */
  highlightedAreaId?: string | null;
  /** CB 点2 (dim) — the sheet's active discipline segment. Pins with NO routes
   *  of this discipline are dimmed (grey + low opacity) so the map emphasizes
   *  the same discipline the list is showing. null = no dim. */
  disciplineFilter?: 'boulder' | 'rope' | null;
  /** CB Phase F (F2) — area_id → TRUE total route count (from the all-crags
   *  preload). The browse sample only carries an area's top ~2 routes, so this
   *  is the only honest per-pin count. Falls back to the sample count when an
   *  area isn't in the preload. */
  areaTotals?: Record<string, number>;
  onAreaPress?: (ctx: AreaPinContext) => void;
  /** When the user taps a cluster bubble, fly camera in. The caller knows
   *  how to compute the next zoom from `getClusterExpansionZoom`. */
  onClusterPress: (coords: [number, number]) => void;
};

/** CB点4 (FU) — lowered 14→13→10: browse pins stay individual across all
 *  normal browse zooms and only cluster when zoomed WAY out (≤10), which
 *  also doubles as a clear "you're in browse mode" signal vs the discover
 *  crag-count bubbles. Mapbox semantics: cluster at zoom ≤ this value,
 *  individual above. Device-tune against the very densest areas. */
const CLUSTER_MAX_ZOOM_LEVEL = 10;
/** Pixel radius for cluster aggregation. CB点4 — 50→32→26: only merge when
 *  pins are nearly on top of each other (mostly relevant at the ≤10 zooms). */
const CLUSTER_RADIUS = 26;

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

const AREA_PIN_RADIUS = 6; // CB点4 — 8→6, smaller browse-mode pins

/** CB 点2 (dim) — pins not matching the active discipline segment fade to a
 *  neutral grey at low opacity: de-emphasized but still visible (not "broken").
 *  Device-tune the opacity against the live map background. */
const DIM_FILL = '#9AA0A6';
const DIM_OPACITY = 0.35;

/** Pre-group RoutePin[] by area_id. Output is one Feature per area,
 *  with the area context attached as properties so tap handlers can
 *  recover canonical UUID + label. Lat/lng = centroid of the grouped
 *  routes. */
export function groupByArea(pins: RoutePin[]): AreaPinContext[] {
  const buckets = new Map<string, { sumLat: number; sumLng: number; count: number; boulders: number; ctx: Omit<AreaPinContext, 'lat' | 'lng' | 'route_count' | 'boulder_count'> }>();
  for (const p of pins) {
    const isBoulder = p.discipline === 'boulder' ? 1 : 0;
    const existing = buckets.get(p.area_id);
    if (existing) {
      existing.sumLat += p.lat;
      existing.sumLng += p.lng;
      existing.count += 1;
      existing.boulders += isBoulder;
    } else {
      buckets.set(p.area_id, {
        sumLat: p.lat,
        sumLng: p.lng,
        count: 1,
        boulders: isBoulder,
        ctx: {
          area_id: p.area_id,
          area_name: p.area_name,
          display_kind: p.display_kind,
        },
      });
    }
  }
  const out: AreaPinContext[] = [];
  for (const { sumLat, sumLng, count, boulders, ctx } of buckets.values()) {
    out.push({
      ...ctx,
      lat: sumLat / count,
      lng: sumLng / count,
      route_count: count,
      boulder_count: boulders,
    });
  }
  return out;
}

function toGeoJSON(
  areas: AreaPinContext[],
  highlightedAreaId?: string | null,
  disciplineFilter?: 'boulder' | 'rope' | null,
  areaTotals?: Record<string, number>,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: areas.map((a) => {
      // CB 点2 (dim) — does this area have ANY route of the active discipline?
      // boulder → boulder_count>0; rope → non-boulder count>0. No filter → not
      // dimmed.
      const ropeCount = a.route_count - a.boulder_count;
      const dimmed =
        disciplineFilter === 'boulder'
          ? a.boulder_count === 0
          : disciplineFilter === 'rope'
            ? ropeCount === 0
            : false;
      return {
      type: 'Feature',
      id: a.area_id,
      properties: {
        area_id: a.area_id,
        area_name: a.area_name,
        display_kind: a.display_kind,
        route_count: a.route_count,
        // CB 点2 — boulder-dominant = strict majority of boulders (ties lean
        // "Routes"). Drives the 2-color fill.
        dominant_boulder: a.boulder_count * 2 > a.route_count,
        dimmed,
        // CB Phase F (F2) — TRUE total (preload) for the per-pin number; the
        // grouped sample count is the fallback when the area isn't preloaded.
        count: areaTotals?.[a.area_id] ?? a.route_count,
        highlighted: a.area_id === highlightedAreaId,
      },
      geometry: {
        type: 'Point',
        coordinates: [a.lng, a.lat],
      },
      };
    }),
  };
}

export default function RoutePinCluster({
  pins,
  styleReady,
  highlightedAreaId,
  disciplineFilter,
  areaTotals,
  onAreaPress,
  onClusterPress,
}: RoutePinClusterProps) {
  const tapHandler = onAreaPress;
  const areaContexts = useMemo(() => groupByArea(pins), [pins]);
  const shape = useMemo(
    () => toGeoJSON(areaContexts, highlightedAreaId, disciplineFilter, areaTotals),
    [areaContexts, highlightedAreaId, disciplineFilter, areaTotals],
  );
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
          circleColor: theme.colors.outdoorMarkerFill,
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
      {/* CB Phase F (F3) — selected pin base: a clean white "lifted" disc so
          the focused pin reads as a white-bordered selected dot. Replaces the
          old translucent-teal halo. The real selected treatment is the donut
          MarkerView (mounted by MapScreenMapbox on top of this); this base is
          the immediate tap feedback + the fallback while the donut's
          composition loads / if it fails. */}
      <MapboxGL.CircleLayer
        id="outdoor-route-pins-highlight"
        filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'highlighted'], true]] as any}
        style={{
          circleColor: '#FFFFFF',
          circleOpacity: 0.95,
          circleRadius: AREA_PIN_RADIUS + 5,
          circleStrokeColor: 'rgba(0,0,0,0.12)',
          circleStrokeWidth: 1,
        }}
      />
      {/* Single area pin — visible at zoom ≥15+ when clusters dissolve.
          CB 点2 — 2-color fill by dominant discipline: sandstone for
          boulder-dominant areas, teal-blue ("Routes") otherwise. Pins that
          don't match the active discipline segment are dimmed: grey fill (去色)
          + low opacity (降透明), so the map emphasizes the same discipline the
          list shows. */}
      <MapboxGL.CircleLayer
        id="outdoor-route-pins-single"
        filter={['!', ['has', 'point_count']]}
        style={{
          circleColor: [
            'case',
            ['get', 'dimmed'],
            DIM_FILL,
            ['case', ['get', 'dominant_boulder'],
              STYLE_COLORS.boulder,
              STYLE_COLORS.sport],
          ] as any,
          circleOpacity: ['case', ['get', 'dimmed'], DIM_OPACITY, 1] as any,
          circleRadius: AREA_PIN_RADIUS,
          circleStrokeColor: '#FFFFFF',
          circleStrokeWidth: 1.2,
          circleStrokeOpacity: ['case', ['get', 'dimmed'], DIM_OPACITY, 1] as any,
        }}
      />
      {/* CB Phase F (F2) — per-pin route count below the dot. SymbolLayer text
          is GPU + auto-collides (textAllowOverlap defaults false), so it thins
          out where pins crowd. Hidden on the selected pin (its donut shows the
          count in the hole) and on dimmed pins (de-emphasized). */}
      <MapboxGL.SymbolLayer
        id="outdoor-route-pins-count"
        filter={['all',
          ['!', ['has', 'point_count']],
          ['!=', ['get', 'dimmed'], true],
          ['>', ['get', 'count'], 0],
        ] as any}
        style={{
          textField: ['to-string', ['get', 'count']] as any,
          textSize: 10,
          textColor: theme.colors.textPrimary,
          textHaloColor: '#FFFFFF',
          textHaloWidth: 1.2,
          textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          textAnchor: 'top',
          textOffset: [0, 0.7],
        }}
      />
    </MapboxGL.ShapeSource>
  );
}
