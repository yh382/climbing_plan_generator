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
  /** BV — upstream provider's stable UUID (OpenBeta area UUID at this
   *  level). Enables incremental sync without full re-import. */
  source_external_id?: string | null;
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
  /** BV — upstream provider's stable UUID (OpenBeta area UUID). */
  source_external_id?: string | null;
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
  /** BV — OpenBeta crag-level approach text (their `content.location`).
   *  Falls back to admin-curated `approach` when both present. */
  location_description?: string | null;
  /** BV — upstream provider's stable UUID (OpenBeta area UUID). */
  source_external_id?: string | null;
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
  /** BV — upstream provider's stable UUID (OpenBeta leaf-area UUID). */
  source_external_id?: string | null;
  /** BU — style-level counts populated by CragDetail endpoint (single
   *  GROUP BY). UX 一级分类 per user 2026-06-07: Boulder / Sport / Trad
   *  primary; everything else (toprope/alpine/multi-pitch/aid/DWS/mixed)
   *  rolls into `other_count` for future 二级 tags UI (BU-FU). Other
   *  endpoints (search / pins / route detail / list) leave these null. */
  boulder_count?: number | null;
  sport_count?: number | null;
  trad_count?: number | null;
  other_count?: number | null;
};

// ---- Level 5: Route (路线, e.g. 鸭子 5.11b) ----

/** OpenBeta `type` flags (independent booleans; a line can be several). The
 *  `_status` sentinel marks rows the backfill couldn't resolve. */
export type RouteDisciplines = {
  trad?: boolean | null;
  sport?: boolean | null;
  bouldering?: boolean | null;
  tr?: boolean | null;
  aid?: boolean | null;
  mixed?: boolean | null;
  ice?: boolean | null;
  alpine?: boolean | null;
  snow?: boolean | null;
  deepwatersolo?: boolean | null;
  _status?: string;
};

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
  style: string; // sport / trad / boulder / multi-pitch / DWS / toprope / alpine / mixed / aid
  /** BS-P1-β product-level discipline (BE-derived from style). FE prefers
   *  this over `style` for boulder/rope count buckets + filter UI since
   *  it's stable as `style` grows (toprope/aid/mixed/alpine). */
  discipline: 'boulder' | 'rope' | 'other';
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
  /** CB 点5 — browse-card breadcrumb from /outdoor/areas/{id}/routes (B1).
   *  crag_display_kind = the route's direct node kind; parent_area_name =
   *  nearest display_kind='area' ancestor → card subtitle "crag · area". */
  crag_display_kind?: string;
  parent_area_name?: string;
  /** CB — full OpenBeta type flags (CC backfill). Powers the Sport/Trad
   *  sub-filter (inclusive: a sport+trad line is both) + the TR card badge.
   *  null/absent for not-yet-backfilled rows → fall back to `style`. */
  disciplines?: RouteDisciplines | null;
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
  /** BV — OpenBeta safety grade (G / PG / PG-13 / R / X). 'UNSPECIFIED'
   *  → omitted on BE side. */
  safety?: string | null;
  /** BV — gear / protection notes from OpenBeta `content.protection`. */
  protection?: string | null;
  /** BV — full grade pyramid keyed by system. Primary grade stays in
   *  `grade_text` + `grade_system` for SQL filtering; `grades_all` lets FE
   *  show e.g. "5.10c / 6b / 19" or auto-pick the user's preferred system. */
  grades_all?: {
    yds?: string | null;
    vscale?: string | null;
    french?: string | null;
    ewbank?: string | null;
    uiaa?: string | null;
    font?: string | null;
  } | null;
  /** BV — OpenBeta ancestor chain {uuid, name?} from root → leaf area.
   *  Forensic / provenance UI (e.g. show full nesting depth on route detail). */
  location_path?: Array<{ uuid: string; name?: string | null }> | null;
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
  /** CA Phase 6.2 — single canonical parent reference (outdoor_areas.id
   *  at the wall-equivalent leaf, occasionally higher). Replaces the
   *  prior 7-column ancestor chain. FE groups pins by area_id; the
   *  ancestor breadcrumb hydrates via `/outdoor/areas/{id}` on tap. */
  area_id: string;
  area_name: string;
  display_kind: string;
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

// ---- BR Track D Day 7 follow-up — Crag overview (tier-1 map source) ----

/** Lightweight Crag projection for client-side `cluster:true` ShapeSource.
 *  PLAN §3.2 redesign — climber-recognizable Crag-level pins replace the
 *  legacy Region-overview source. Loaded once on gyms-mode mount (~15k
 *  rows NA prod). Aggregate counts computed BE-side in one GROUP BY. */
/** BS-P1-γ (2026-06-06) — coordinate provenance triple. Embedded in
 *  CragOverview + CragDetail. FE uses to label derived coords as
 *  approximate (safety/trust: centroid OK for overview but NOT for
 *  approach targets). */
export type LocationAudit = {
  source: 'user' | 'admin' | 'import' | 'osm' | 'derived' | null;
  method: 'explicit' | 'centroid:routes' | 'centroid:walls' | 'centroid:area' | null;
  confidence: 'high' | 'medium' | 'low' | null;
};

export type CragOverview = {
  id: string;
  name: string;
  name_en?: string | null;
  lat: number;
  lng: number;
  route_count: number;
  /** BS-P1-β (2026-06-06) — discipline buckets sum to `route_count`,
   *  pivoting on BE `OutdoorRoute.discipline` ('boulder' | 'rope' |
   *  'other'). Powers the upcoming BS-P1-ζ Boulder/Rope composition
   *  ring (renders only when `unknown_count / route_count <= 0.3` to
   *  avoid misleading display). */
  boulder_count: number;
  rope_count: number;
  unknown_count: number;
  region_id: string;
  region_name: string;
  location: LocationAudit;
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

/** Trail data provenance (BR Track C audit column).
 *  - `osm` — auto-fetched OSM Overpass nearby trails (reference only,
 *    NOT a verified approach). Rendered subtly (gray + low opacity).
 *  - `admin` / `user` — curated trail submitted by admin or user
 *    (verified approach). Rendered prominently (accent + dashed).
 *  - `mixed` — combination of admin/user + OSM. Treated as verified
 *    (conservative: if any human curated input, treat as approach).
 *  - `null` — no trail data. */
export type TrailSource = 'osm' | 'admin' | 'user' | 'mixed';

export type CragDetail = Crag & {
  /** BR Track C audit columns — null when no OSM Overpass sync yet.
   *  Narrowed to TrailSource union in BS Track B (visual split). */
  trail_source?: TrailSource | null;
  osm_synced_at?: string | null;
  walls: Wall[];
  community: CragCommunitySummary;
  /** BS-P1-γ — coordinate provenance audit. Use to decide whether to
   *  show an "approximate location based on route coordinates" banner
   *  in CragInfoSheet. */
  location: LocationAudit;
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

// ---- CA Phase 3: outdoor_areas single self-referencing tree ----
//
// Replaces the 5-layer Region/Area/Crag/Wall hierarchy with one shape.
// Mirrors backend schemas/outdoor_areas.py (OutdoorAreaOut + OutdoorAreaDetail).
// Phase 6 will delete Region / Area / Crag / Wall types from this file.

export type DisplayKind =
  | 'country'
  | 'state'
  | 'region'
  | 'area'
  | 'crag'
  | 'wall';

export type LocationConfidence = 'high' | 'medium' | 'low';

export type AncestorBreadcrumb = {
  id: string;
  name: string;
  display_kind: DisplayKind;
  depth: number;
};

// LocationAudit is already declared above (BS-P1-γ — line ~321). Its
// shape is fully compatible with what CA Phase 2 returns, so we reuse it
// rather than defining a duplicate.

export type OutdoorArea = {
  id: string;
  source: string;
  source_external_id?: string | null;

  // Tree shape
  parent_id?: string | null;
  path_ids: string[];
  depth: number;

  // Naming
  name: string;
  name_en?: string | null;

  // Geo
  lat?: number | null;
  lng?: number | null;

  // Kind
  computed_kind: DisplayKind;
  display_kind: DisplayKind;
  display_kind_locked: boolean;

  // Cached counts (DB-trigger maintained)
  direct_route_count: number;
  subtree_route_count: number;
  direct_child_count: number;
  has_routes: boolean;
  has_subareas: boolean;

  // Content
  cover_url?: string | null;
  description?: string | null;
  approach?: string | null;
  // CA-FU-1 — approach trail GeoJSON (re-exposed on /outdoor/areas/{id}).
  trail_geojson?: TrailFeatureCollection | null;
  trail_source?: TrailSource | null;

  // Location audit (flat — kept for back-compat with adapter pattern)
  location_source?: string | null;
  location_method?: string | null;
  location_confidence?: LocationConfidence | null;

  // Workflow
  status: string;
  created_at: string;
  updated_at: string;
};

// Detail response — adds ancestors breadcrumb + structured location_audit.
// FE renders breadcrumb + audit pill from a single fetch.
export type OutdoorAreaDetail = OutdoorArea & {
  ancestors: AncestorBreadcrumb[];
  location_audit: LocationAudit;
};

// Lightweight projection for /children / /areas?bbox / /search responses.
// Skips ancestors / description / approach to save payload.
export type OutdoorAreaListItem = {
  id: string;
  name: string;
  name_en?: string | null;
  display_kind: DisplayKind;
  depth: number;
  parent_id?: string | null;

  lat?: number | null;
  lng?: number | null;

  direct_route_count: number;
  subtree_route_count: number;
  direct_child_count: number;
  has_routes: boolean;
  has_subareas: boolean;

  cover_url?: string | null;
};

// Coverage polygon: convex hull GeoJSON + bbox.
// polygon === null when fewer than 3 distinct route points exist.
export type BBox = {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
};

export type CoverageResponse = {
  polygon: GeoJSON.Feature<GeoJSON.Polygon> | null;
  point_count: number;
  bbox: BBox | null;
};

// Coverage 422 error shape (FE matches on `error` field).
export type CoverageErrorTooBroad = {
  error: 'coverage_too_broad';
  message: string;
  min_display_kind: DisplayKind;
  current_display_kind: DisplayKind;
};

export type CoverageErrorSubtreeTooLarge = {
  error: 'subtree_too_large';
  message: string;
  subtree_route_count: number;
};

export type CoverageErrorBboxInvalid = {
  error: 'bbox_invalid';
  message: string;
};

export type AreaSearchResponse = {
  items: OutdoorAreaListItem[];
  total: number;
};

// ---- CA-FU Phase B — compact crag preload (GET /outdoor/areas/crags) ----

/** Three-bucket discipline rollup, aligned with OutdoorRoute.discipline. */
export type DisciplineCounts = {
  boulder: number;
  rope: number;
  other: number;
};

/** CB Phase F — single-area STYLE-level 4-bucket composition for the selected-
 *  pin ratio ring. boulder+sport+trad+other == total (a partition), so the
 *  donut always fills 360°. `other` = toprope/aid/mixed/alpine/etc. */
export type AreaComposition = {
  total: number;
  boulder: number;
  sport: number;
  trad: number;
  other: number;
};

/** One crag-tier pin in the preload source. */
export type CragPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  route_count: number;
  discipline_counts: DisciplineCounts;
};

/** Full preload payload. data_version is a content hash for SWR cache
 *  validation (stable across identical data, changes on any field/route). */
export type CragPinsResponse = {
  items: CragPin[];
  count: number;
  data_version: string;
};

// Legacy alias envelope (7-14d bridge) — FE can show deprecation hint.
export type LegacyAliasResponse = {
  deprecated: boolean;
  canonical_url: string;
  area: OutdoorAreaDetail;
};
