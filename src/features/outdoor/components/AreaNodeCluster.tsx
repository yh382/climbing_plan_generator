/**
 * AreaNodeCluster — Window CD Phase 2 tier-1 map source.
 *
 * Replaces the geometric supercluster (CragOverviewCluster) with the
 * Mountain-Project / onX **tree** model: every area-tree node (country →
 * crag) is a single ratio-ring pin, preloaded once via useAllAreaNodes
 * (~43k nodes, stable source, M3). There is NO geometric clustering — the
 * tree layering is a DETERMINISTIC JS selection (areaNodeSelection.ts):
 *
 *   - per integer zoom bucket, a grid-greedy pass keeps the highest-
 *     importance node per neighborhood → the visible set is a pure function
 *     of (nodes, zoomBucket), independent of viewport. Panning can never
 *     change what's shown (Mapbox collision placement is viewport-relative
 *     and made rings flicker in/out mid-pan — device find 2026-07-16).
 *   - selected symbols render with allowOverlap:true, so Mapbox's own
 *     collision engine never hides them (and never runs over 43k nodes).
 *   - name labels still collide (textAllowOverlap:false): label flicker is
 *     standard map behavior and piling them up reads worse.
 *
 * Tap any node → onNodePress(node) → caller `enterArea(node.id)` → the tabbed
 * area page (same drill model as crag-pin tap / breadcrumb / saved-spot).
 *
 * The ratio ring reuses the discover composition palette (STYLE_COLORS) and
 * the same 11-bucket quantized boulder-fraction images as the legacy cluster
 * (GPU-rasterized SymbolLayer iconImage — MarkerView would choke on 43k).
 */
import { useCallback, useMemo } from 'react';
import MapboxGL from '@rnmapbox/maps';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '../../../lib/useThemeColors';
import { selectNodesForBucket } from '../areaNodeSelection';
import { STYLE_COLORS } from '../disciplineColors';
import type { AreaNode } from '../types';

function formatCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Composition ring (boulder-vs-rope, 11 quantized buckets) ────────
// Same recipe as the legacy CragOverviewCluster ring, but with a WHITE base
// disc baked in (so the count is legible and the whole pin reads as one
// collision unit — no separate CircleLayer, which can't collide).
const RING_BUCKETS = 10; // → 11 images, indices 0..10
const RING_IMG = 48;
const RING_STROKE = 6;
const RING_R = (RING_IMG - RING_STROKE) / 2;
const RING_C = RING_IMG / 2;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_INNER = RING_R - RING_STROKE / 2; // white fill radius

function AreaRingIcon({ boulderFraction }: { boulderFraction: number }) {
  const bLen = boulderFraction * RING_CIRC;
  return (
    <Svg width={RING_IMG} height={RING_IMG}>
      {/* white base disc — count legibility + solid pin (collides as one unit) */}
      <Circle cx={RING_C} cy={RING_C} r={RING_INNER} fill="#FFFFFF" />
      {/* full rope (blue) base ring; `other`/trad fold into it at this zoom */}
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

// iconImage: boulder / total subtree composition, quantized to 10% buckets
// (`other` + trad fold into the rope/blue arc at overview zoom).
const RING_FRACTION = [
  '/',
  ['get', 'boulder_count'],
  ['max', 1, ['get', 'total_count']],
] as const;
const RING_IMAGE_EXPR: any = ['step', RING_FRACTION, 'area-ring-0'];
for (let i = 1; i <= RING_BUCKETS; i++) {
  RING_IMAGE_EXPR.push((i * 10 - 5) / 100, `area-ring-${i}`);
}

// iconSize: scale the 48px ring down by subtree_route_count so big subtrees
// (states/regions) read heavier. Outer radius 8→24px, mirroring the legacy
// cluster bubble scale.
const RING_SIZE_EXPR = [
  'step',
  ['get', 'subtree_route_count'],
  8 / 23,
  100, 12 / 23,
  500, 16 / 23,
  2000, 20 / 23,
  10000, 24 / 23,
] as const;

const TEXT_SIZE_EXPR = [
  'step',
  ['get', 'subtree_route_count'],
  9,
  100, 11,
  500, 13,
  2000, 15,
  10000, 17,
] as const;

// high subtree_route_count placed first (kept for label collision priority
// and stable draw order among the selected set).
const SORT_KEY: any = ['-', 0, ['get', 'subtree_route_count']];

function toGeoJSON(nodes: AreaNode[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: nodes.map((n) => ({
      type: 'Feature',
      id: n.id,
      properties: {
        node_id: n.id,
        node_name: n.name,
        display_kind: n.display_kind,
        subtree_route_count: n.subtree_route_count,
        boulder_count: n.composition.boulder,
        total_count: n.composition.total,
        count_label: n.subtree_route_count > 0 ? formatCount(n.subtree_route_count) : '',
      },
      geometry: {
        type: 'Point',
        coordinates: [n.lng, n.lat],
      },
    })),
  };
}

export type AreaNodeClusterProps = {
  nodes: AreaNode[];
  styleReady: boolean;
  /** Integer zoom bucket (clampZoomBucket) — picks the deterministic
   *  per-tier visible set. Owned by MapScreenMapbox's onCameraChanged. */
  zoomBucket: number;
  /** Tap a node → caller enters its area page (enterArea). */
  onNodePress: (node: AreaNode) => void;
};

export default function AreaNodeCluster({
  nodes,
  styleReady,
  zoomBucket,
  onNodePress,
}: AreaNodeClusterProps) {
  const colors = useThemeColors();

  const visible = useMemo(
    () => selectNodesForBucket(nodes, zoomBucket),
    [nodes, zoomBucket],
  );
  const shape = useMemo(() => toGeoJSON(visible), [visible]);
  const lookup = useMemo(() => {
    const map = new Map<string, AreaNode>();
    for (const n of visible) map.set(n.id, n);
    return map;
  }, [visible]);

  const handlePress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => {
      const id = e.features?.[0]?.properties?.node_id as string | undefined;
      if (!id) return;
      const node = lookup.get(id);
      if (node) onNodePress(node);
    },
    [lookup, onNodePress],
  );

  if (!styleReady || shape.features.length === 0) return null;

  return (
    <>
      <MapboxGL.Images>
        {RING_INDEXES.map((i) => (
          <MapboxGL.Image key={i} name={`area-ring-${i}`}>
            <AreaRingIcon boulderFraction={i / RING_BUCKETS} />
          </MapboxGL.Image>
        ))}
      </MapboxGL.Images>
      <MapboxGL.ShapeSource id="area-node-src" shape={shape} onPress={handlePress}>
        {/* The shape already IS the deterministic per-bucket visible set, so
            ring + count render unconditionally (allowOverlap) — Mapbox's
            viewport-relative collision must never re-hide a selected node
            (that's the pan-flicker this replaces). */}
        <MapboxGL.SymbolLayer
          id="area-node-ring"
          style={{
            iconImage: RING_IMAGE_EXPR,
            iconSize: RING_SIZE_EXPR as any,
            iconAllowOverlap: true,
            textField: ['get', 'count_label'] as any,
            textSize: TEXT_SIZE_EXPR as any,
            textColor: colors.textPrimary,
            textHaloColor: '#FFFFFF',
            textHaloWidth: 1.2,
            textAllowOverlap: true,
            symbolSortKey: SORT_KEY,
          }}
        />
        {/* Name label below the pin, gated above an importance floor so dense
            areas don't pile labels. Labels still collide — label flicker is
            normal map behavior; rings must not. */}
        <MapboxGL.SymbolLayer
          id="area-node-labels"
          filter={['>', ['get', 'subtree_route_count'], 5] as any}
          style={{
            textField: ['get', 'node_name'] as any,
            textSize: ['interpolate', ['linear'], ['zoom'], 8, 11, 11, 12, 14, 13.5] as any,
            textColor: colors.outdoorLabelText,
            textHaloColor: colors.outdoorLabelHalo,
            textHaloWidth: 1.5,
            textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            textAnchor: 'top',
            textOffset: [0, 2.4],
            textAllowOverlap: false,
            textOptional: true,
            textMaxWidth: 10,
            symbolSortKey: SORT_KEY,
          }}
        />
      </MapboxGL.ShapeSource>
    </>
  );
}
