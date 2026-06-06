// src/features/outdoor/types.ts
// 5-level hierarchy (post BR Track A rename): Region → Area → Crag → Wall → Route

// ---- Shared sub-types ----

export type PhotoItem = {
  url: string;
  thumb_url?: string;
  caption?: string;
};

export type Transport = {
  driving?: string;
  public_transit?: string;
  parking?: { lat: number; lng: number; description?: string; capacity?: string };
  nearest_city?: string;
  nearest_city_distance_km?: number;
};

export type Accommodation = {
  name: string;
  type: string;
  distance_km?: number;
  price_range?: string;
  contact?: string;
  note?: string;
};

// ---- Level 1: Region (攀岩大区域, e.g. Wasatch Range, 阳朔) ----

// GeoJSON LineString feature collection — approach trail overlay.
// Feature properties are ignored by the renderer (line-only).
export type TrailFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: {
      type: 'LineString';
      coordinates: Array<[number, number]>;
    };
  }>;
};

export type Region = {
  id: string;
  name: string;
  name_en?: string;
  region?: string;
  country: string;
  lat?: number;
  lng?: number;
  description?: string;
  approach?: string;
  approach_time_min?: number;
  approach_difficulty?: string;
  approach_photos?: PhotoItem[];
  transport?: Transport;
  accommodation?: Accommodation[];
  amenities?: string[];
  best_seasons?: string[];
  safety_notes?: string;
  emergency_info?: string;
  cover_url?: string;
  photos?: PhotoItem[];
  /** Legacy column kept on Region post-rename. PLAN §9.1 puts trail data
   *  on Crag instead; Track D map redesign consumes Crag.trail_geojson. */
  trail_geojson?: TrailFeatureCollection | null;
  status: string;
  area_count?: number;
  /** All routes (rope + boulder) for backward compat. Derive rope-only
   *  count as (route_count - boulder_count). */
  route_count?: number;
  boulder_count?: number;
  is_favorited?: boolean;
};

// ---- Level 2: Area (攀岩区, e.g. Central Wasatch, 白山地区) ----

export type Area = {
  id: string;
  region_id: string;
  name: string;
  name_en?: string;
  lat?: number;
  lng?: number;
  description?: string;
  approach?: string;
  cover_url?: string;
  status: string;
  crag_count?: number;
  route_count?: number;
};

// ---- Level 3: Crag (攀岩点, e.g. Little Cottonwood Canyon, 鸡蛋山) ----
// Primary user-facing entity per PLAN §3.5.

export type Crag = {
  id: string;
  area_id: string;
  name: string;
  name_en?: string;
  lat?: number;
  lng?: number;
  orientation?: string;
  description?: string;
  approach?: string;
  sort_order: number;
  status: string;
  // BR Track A new optional fields (writers wired in Track C)
  cover_url?: string | null;
  trail_geojson?: TrailFeatureCollection | null;
  wall_count?: number;
  route_count?: number;
};

// ---- Level 4: Wall (一面墙, e.g. 梦幻墙) ----

export type Wall = {
  id: string;
  crag_id: string;
  name: string;
  name_en?: string;
  lat?: number;
  lng?: number;
  orientation?: string;
  topo_url?: string;
  description?: string;
  approach?: string;
  sort_order: number;
  status: string;
  route_count?: number;
  routes?: OutdoorRoute[];
};

// ---- Level 5: Route (路线, e.g. 鸭子 5.11b) ----

export type OutdoorRoute = {
  id: string;
  wall_id: string;
  name: string;
  name_en?: string;
  grade_text: string;
  grade_system: string;
  grade_score?: number;
  length_m?: number;
  pitches: number;
  bolts?: number;
  style: string; // sport / trad / boulder / multi-pitch / DWS
  first_ascent?: string;
  description?: string;
  photos?: PhotoItem[];
  stars?: number;
  rating_count: number;
  send_count: number;
  attempt_count: number;
  // Display context (populated by API or joined in frontend).
  // BR Track A: ancestry chain renamed sector_name→crag_name, crag_name→area_name,
  // area_name→region_name. FE prefers area_name as the session label
  // (matches the user's mental model — "today I climbed in Little Cottonwood",
  // not "today I climbed on North Face").
  wall_name?: string;
  crag_name?: string;
  area_name?: string;
  region_name?: string;
  wall_topo_url?: string;
  // BR Track D Day 6 — optional GPS surfaced by BE on detail. Used by the
  // route-detail mini-map (PLAN §5). Falls back to no-map render when
  // either is missing (e.g. legacy import without per-route coords).
  lat?: number;
  lng?: number;
  // BR Track D Day 7 — full ancestor UUID chain (PLAN §5). BE
  // `RouteOut` returns these via JOIN projection in get_route. FE
  // OutdoorRouteDetailPage breadcrumb segments use them to seed the
  // RegionInfoSheet / AreaInfoSheet / CragInfoSheet on tap. wall_id is
  // already a required field on the base type (route belongs to a
  // wall); the other 3 are nullable since only the detail endpoint
  // populates them.
  region_id?: string;
  area_id?: string;
  crag_id?: string;
};

// ---- Route-level social data ----

export type RouteRating = {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  stars: number;
  comment?: string;
  created_at: string;
};

export type RouteAscent = {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  result: string; // send / flash / onsight / attempt
  /** Grader's text grade (e.g. "5.11b" / "V5"). Window D1_D2_E2 — echoed
   *  by /outdoor/routes/{id}/ascents so GradeSuggestionCard can plot a
   *  per-grade histogram without a second round-trip. */
  grade_text?: string | null;
  /** Per-log subjective feel ('soft' | 'solid' | 'hard'). Window
   *  D1_D2_E2 — same purpose as grade_text. */
  feel?: 'soft' | 'solid' | 'hard' | null;
  style_tags?: string[] | null;
  attempts: number;
  date: string;
  note?: string;
};

// ---- Map pin types (lightweight, for map layers) ----

/** Legacy pin shape returned by `/outdoor/regions/{id}/pins` aggregator.
 *  Pre-aggregated per-level (region / area / crag / wall / route).
 *  Track D deletes this on Day 6 once the lock-step crag-map.tsx mirror
 *  + MapScreenMapbox have both migrated to `RoutePin` + Mapbox cluster. */
export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Aggregate count displayed inside the pin (always 1 for route-level). */
  route_count: number;
  level: 'region' | 'area' | 'crag' | 'wall' | 'route';
  parent_id?: string;
  parent_name?: string;
};

/** BR Track D — flat per-route pin returned by `/outdoor/pins?bbox=...`.
 *  Track C D-1 added the 4 ancestor IDs so FE can client-side group by
 *  `wall_id` (single Wall pin invariant at zoom 15+) and tap-routing
 *  works without a second lookup. Matches BE Pydantic `RoutePin` in
 *  `climbing_plan_backend/schemas/outdoor.py::RoutePin` exactly. */
export type RoutePin = {
  route_id: string;
  lat: number;
  lng: number;
  wall_id: string;
  wall_name: string;
  crag_id: string;
  crag_name: string;
  area_id: string;
  area_name: string;
  region_id: string;
  region_name: string;
  /** BE includes 'other' for routes that don't cleanly classify (e.g.
   *  via ferrata, aid). FE filter chips only cover boulder/rope; other
   *  pins show under [All] but no dedicated chip. */
  discipline: 'boulder' | 'rope' | 'other';
  /** Free-form per BE (Track B import may produce mixed-case / commas).
   *  FE normalizes via toLowerCase + split(',') before chip matching. */
  style: string;
};

export type RoutePinsResponse = {
  items: RoutePin[];
  count: number;
  /** True when the response hit the bbox query's `limit` cap. FE renders
   *  a "zoom in for more" hint. */
  truncated: boolean;
};

// ---- BR Track D — Crag detail (CragInfoSheet source) ----

/** Crag-level activity rollup over the last 30 days. Counts-only per
 *  PLAN §3.3 / Phase 1 D-2 decision — full post list is a follow-up
 *  (BR-Track-D-FU-community-posts). */
export type CragCommunitySummary = {
  recent_post_count: number;
  recent_ascent_count: number;
  last_activity_at: string | null;
};

export type CragDetail = Crag & {
  /** BR Track C audit columns — null when no OSM Overpass sync yet. */
  trail_source?: string | null;
  osm_synced_at?: string | null;
  walls: Wall[];
  community: CragCommunitySummary;
};

// ---- BR Track D — Cross-level search ----

/** Single result shape — `type` discriminator + nullable context fields
 *  per BE `SearchResult`. Use `getSearchHitMetaLabel(hit)` (in `hooks.ts`)
 *  to derive the per-row UI subtitle without hand-narrowing the union. */
export type SearchResult = {
  type: 'region' | 'area' | 'crag' | 'wall' | 'route';
  id: string;
  name: string;
  name_en?: string | null;
  crag_name?: string | null;
  area_name?: string | null;
  region_name?: string | null;
  grade_text?: string | null;
  style?: string | null;
  route_count?: number | null;
  /** @deprecated Track C dual-write — drops after Track D consumers
   *  migrate to top-level fields. */
  extra?: Record<string, unknown> | null;
};

// ---- BR Track D — Polymorphic Saved Spots ----

/** Region / Area / Crag / Route — all savable into the user's spots set. */
export type SavedSpotTargetType = 'region' | 'area' | 'crag' | 'route';

export type SavedSpot = {
  target_type: SavedSpotTargetType;
  target_id: string;
  target_name: string;
  lat?: number | null;
  lng?: number | null;
  added_at: string;
};

export type SavedSpotsResponse = {
  items: SavedSpot[];
  count: number;
};

// ---- User Lists (Window U) ----
// Visibility is global (managed via Settings → Privacy → "My Lists"),
// not per-list. See PrivacySettings.lists_public on the backend.

export type OutdoorList = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cover_route_id?: string;
  item_count: number;
  created_at: string;
  updated_at: string;
};

export type OutdoorListItem = {
  id: string;
  list_id: string;
  /** BR Track C polymorphic — target_type discriminates which entity
   *  this row points at. Legacy `route_id` is still populated when
   *  target_type === 'route' during the compat window. */
  target_type: SavedSpotTargetType;
  target_id: string;
  /** @deprecated populated only when target_type === 'route'. Drop
   *  after Track D consumers migrate. */
  route_id?: string | null;
  note?: string;
  added_at: string;
  /** Hydrated by BE batch JOIN — populated only for route-type items. */
  route?: OutdoorRoute;
  // Denormalized on list detail responses (see backend /outdoor/lists/{id})
  wall_lat?: number;
  wall_lng?: number;
  wall_name?: string;
  crag_name?: string;
  /** For non-route targets, the saved entity's display name. */
  target_name?: string | null;
};

export type OutdoorListDetail = OutdoorList & {
  items: OutdoorListItem[];
};

export type RouteContainment = {
  list_id: string;
  item_id: string;
};
