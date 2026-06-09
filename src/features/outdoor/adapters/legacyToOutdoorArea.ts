// src/features/outdoor/adapters/legacyToOutdoorArea.ts
//
// CA Phase 3 — 7-14 day alias bridge between BU/BR-era legacy types
// (Region / Area / Crag / Wall) and the new single-tree OutdoorArea.
//
// Adapter fills new fields with best-known defaults; the result is a
// DEGENERATE OutdoorArea — `path_ids=[id]`, `parent_id=null`, `depth=0` —
// because legacy types don't carry their real ancestor chain or cached
// subtree counts. This is acceptable ONLY during the alias period:
// callers must NOT use the result for path-aware tap (4-case matrix), as
// that requires the real path_ids chain.
//
// Phase 6 deletes this file together with Region / Area / Crag / Wall types.

import type {
  Area, Crag, OutdoorArea, Region, Wall,
} from '../types';

/** Legacy Region → OutdoorArea (display_kind='region', no ancestors). */
export function regionToOutdoorArea(r: Region): OutdoorArea {
  return {
    id: r.id,
    source: 'openbeta',
    source_external_id: (r as any).source_external_id ?? null,
    parent_id: null,
    path_ids: [r.id],
    depth: 0,
    name: r.name,
    name_en: r.name_en ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    computed_kind: 'region',
    display_kind: 'region',
    display_kind_locked: false,
    direct_route_count: 0,
    subtree_route_count: 0,
    direct_child_count: 0,
    has_routes: false,
    has_subareas: false,
    cover_url: (r as any).cover_url ?? null,
    description: r.description ?? null,
    approach: (r as any).approach ?? null,
    location_source: null,
    location_method: null,
    location_confidence: null,
    status: (r as any).status ?? 'approved',
    created_at: (r as any).created_at ?? new Date(0).toISOString(),
    updated_at: (r as any).updated_at ?? new Date(0).toISOString(),
  };
}

/** Legacy Area → OutdoorArea (display_kind='area'). */
export function areaToOutdoorArea(a: Area): OutdoorArea {
  return {
    id: a.id,
    source: 'openbeta',
    source_external_id: (a as any).source_external_id ?? null,
    parent_id: a.region_id ?? null,
    path_ids: [a.id],  // degenerate — real path requires region chain
    depth: 0,
    name: a.name,
    name_en: a.name_en ?? null,
    lat: (a as any).lat ?? null,
    lng: (a as any).lng ?? null,
    computed_kind: 'area',
    display_kind: 'area',
    display_kind_locked: false,
    direct_route_count: 0,
    subtree_route_count: 0,
    direct_child_count: 0,
    has_routes: false,
    has_subareas: false,
    cover_url: (a as any).cover_url ?? null,
    description: a.description ?? null,
    approach: (a as any).approach ?? null,
    location_source: null,
    location_method: null,
    location_confidence: null,
    status: (a as any).status ?? 'approved',
    created_at: (a as any).created_at ?? new Date(0).toISOString(),
    updated_at: (a as any).updated_at ?? new Date(0).toISOString(),
  };
}

/** Legacy Crag → OutdoorArea (display_kind='crag'). */
export function cragToOutdoorArea(c: Crag): OutdoorArea {
  const routeCount = (c as any).route_count ?? 0;
  return {
    id: c.id,
    source: 'openbeta',
    source_external_id: (c as any).source_external_id ?? null,
    parent_id: c.area_id ?? null,
    path_ids: [c.id],  // degenerate
    depth: 0,
    name: c.name,
    name_en: c.name_en ?? null,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    computed_kind: 'crag',
    display_kind: 'crag',
    display_kind_locked: false,
    direct_route_count: routeCount,
    subtree_route_count: routeCount,
    direct_child_count: 0,
    has_routes: routeCount > 0,
    has_subareas: false,
    cover_url: c.cover_url ?? null,
    description: c.description ?? null,
    approach: (c as any).approach ?? null,
    location_source: (c as any).location_source ?? null,
    location_method: (c as any).location_method ?? null,
    location_confidence: (c as any).location_confidence ?? null,
    status: (c as any).status ?? 'approved',
    created_at: (c as any).created_at ?? new Date(0).toISOString(),
    updated_at: (c as any).updated_at ?? new Date(0).toISOString(),
  };
}

/** Legacy Wall → OutdoorArea (display_kind='wall'). */
export function wallToOutdoorArea(w: Wall): OutdoorArea {
  const routeCount = (w as any).route_count ?? 0;
  return {
    id: w.id,
    source: 'openbeta',
    source_external_id: (w as any).source_external_id ?? null,
    parent_id: w.crag_id ?? null,
    path_ids: [w.id],
    depth: 0,
    name: w.name,
    name_en: w.name_en ?? null,
    lat: (w as any).lat ?? null,
    lng: (w as any).lng ?? null,
    computed_kind: 'wall',
    display_kind: 'wall',
    display_kind_locked: false,
    direct_route_count: routeCount,
    subtree_route_count: routeCount,
    direct_child_count: 0,
    has_routes: routeCount > 0,
    has_subareas: false,
    cover_url: null,
    description: w.description ?? null,
    approach: null,
    location_source: null,
    location_method: null,
    location_confidence: null,
    status: (w as any).status ?? 'approved',
    created_at: (w as any).created_at ?? new Date(0).toISOString(),
    updated_at: (w as any).updated_at ?? new Date(0).toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════
//  Path-aware tap matrix (CA Phase 3 — 4-case decision)
//  Pure logic helper, no React. Caller wires to MapScreenMapbox.tsx.
//  Plan v8 §Phase 3 "Path-aware tap matrix":
//    Case D — tapped == browsing       → open current sheet
//    Case A — tapped is descendant     → drill in (keep browsing)
//    Case B — tapped is ancestor       → zoom out (pop browse up)
//    Case C — tapped is outside tree   → switch context (covers initial tap)
//  Note: requires REAL path_ids — adapter outputs are degenerate. During
//  alias period, callers must fetch via api.getArea before tap-matrix.
// ════════════════════════════════════════════════════════════════

export type TapDecision =
  | { kind: 'sheet_self' }                     // Case D
  | { kind: 'drill_in'; tapped: OutdoorArea } // Case A
  | { kind: 'zoom_out'; tapped: OutdoorArea } // Case B
  | { kind: 'switch_context'; tapped: OutdoorArea }; // Case C (incl. initial)

export function classifyAreaTap(
  tapped: OutdoorArea,
  browsing: OutdoorArea | null,
): TapDecision {
  // Case D — exact match
  if (browsing && tapped.id === browsing.id) {
    return { kind: 'sheet_self' };
  }
  // Case A — tapped is descendant of browsing
  // (browsing.id appears in tapped's path_ids chain)
  if (browsing && tapped.path_ids.includes(browsing.id)) {
    return { kind: 'drill_in', tapped };
  }
  // Case B — tapped is ancestor of browsing
  // (tapped.id appears in browsing's path_ids chain)
  if (browsing && browsing.path_ids.includes(tapped.id)) {
    return { kind: 'zoom_out', tapped };
  }
  // Case C — outside tree OR initial tap (browsing === null)
  return { kind: 'switch_context', tapped };
}
