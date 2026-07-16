// src/features/outdoor/areaNodeSelection.ts
// CD Phase 2 (M3 follow-up) — deterministic, viewport-independent visible-set
// selection for AreaNodeCluster.
//
// Why: Mapbox symbol collision placement is computed against the CURRENT
// viewport, so panning at a fixed zoom re-runs placement and flips which
// nodes win — rings visibly appear/disappear mid-pan (device find
// 2026-07-16). Selecting the visible set in JS from the full preloaded tree
// makes it a pure function of (nodes, zoom bucket): same set at every
// viewport, so panning can never change what's shown.
//
// How: per integer zoom bucket, greedily place nodes in importance order
// (subtree_route_count desc) onto a fixed Web-Mercator grid sized to the
// on-screen icon footprint at that bucket's midpoint zoom. A node is kept
// only when its 3×3 cell neighborhood is free, guaranteeing ≥1 cell of
// spacing between any two kept nodes. Results are cached per (nodes, bucket).

import type { AreaNode } from './types';

// Buckets below MIN behave like MIN (national overview); at ≥MAX every
// candidate passes (inside-crag zooms where overlaps are rare and drilling
// is imminent anyway).
const MIN_BUCKET = 3;
const MAX_BUCKET = 15;

// Importance floors — mirrors the zoom-stepped Mapbox filter this replaces.
function importanceFloor(bucket: number): number {
  if (bucket < 6) return 200;
  if (bucket < 8) return 60;
  if (bucket < 10) return 20;
  if (bucket < 12) return 5;
  return 0;
}

// Minimum on-screen spacing between kept nodes, in px at the bucket's
// midpoint zoom. Icon disc is ≤48px (iconSize ≤ 24/23) + text halo; within a
// bucket the true on-screen spacing drifts by ±√2 (zoom continuous, grid
// fixed). Device-tunable.
const SPACING_PX = 64;

// Mapbox world = one 512px tile at zoom 0; mercator coords normalized [0,1).
function cellSizeMercator(bucket: number): number {
  const zMid = bucket + 0.5;
  return SPACING_PX / (512 * Math.pow(2, zMid));
}

function lngToX(lng: number): number {
  return (lng + 180) / 360;
}

function latToY(lat: number): number {
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return Math.min(1, Math.max(0, y));
}

export function clampZoomBucket(zoom: number): number {
  return Math.min(MAX_BUCKET, Math.max(MIN_BUCKET, Math.floor(zoom)));
}

// Cache keyed on the nodes array identity (useAllAreaNodes returns a stable
// array per load) → per-bucket selections computed lazily, once.
const selectionCache = new WeakMap<AreaNode[], Map<number, AreaNode[]>>();

export function selectNodesForBucket(nodes: AreaNode[], bucket: number): AreaNode[] {
  let byBucket = selectionCache.get(nodes);
  if (!byBucket) {
    byBucket = new Map();
    selectionCache.set(nodes, byBucket);
  }
  const cached = byBucket.get(bucket);
  if (cached) return cached;

  const floor = importanceFloor(bucket);
  const candidates = nodes.filter((n) => n.subtree_route_count >= floor);

  let result: AreaNode[];
  if (bucket >= MAX_BUCKET) {
    result = candidates;
  } else {
    // Importance-desc, id tie-break → fully deterministic ordering.
    const sorted = [...candidates].sort(
      (a, b) =>
        b.subtree_route_count - a.subtree_route_count ||
        (a.id < b.id ? -1 : 1),
    );
    const cell = cellSizeMercator(bucket);
    const occupied = new Set<string>();
    result = [];
    for (const n of sorted) {
      const cx = Math.floor(lngToX(n.lng) / cell);
      const cy = Math.floor(latToY(n.lat) / cell);
      let free = true;
      for (let dx = -1; dx <= 1 && free; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (occupied.has(`${cx + dx}:${cy + dy}`)) {
            free = false;
            break;
          }
        }
      }
      if (!free) continue;
      occupied.add(`${cx}:${cy}`);
      result.push(n);
    }
  }
  byBucket.set(bucket, result);
  return result;
}
