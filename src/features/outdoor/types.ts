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

export type MapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Aggregate count displayed inside the pin (always 1 for route-level). */
  route_count: number;
  level: 'region' | 'area' | 'crag' | 'wall' | 'route';
  /** Only set when `level === 'route'` — id of the parent wall. Used to
   *  reconstruct the wall's route list + metadata when the user taps a
   *  route pin (sheet opens focused on that route). */
  parent_id?: string;
  /** Only set when `level === 'route'` — name of the parent wall. Sent
   *  by BE so the FE can render the sheet title and synthesize a wall
   *  object even when wall pins are not in the list (BK: synthetic
   *  walls are deduped against their parent Crag). */
  parent_name?: string;
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
  route_id: string;
  note?: string;
  added_at: string;
  route?: OutdoorRoute;
  // Denormalized on list detail responses (see backend /outdoor/lists/{id})
  wall_lat?: number;
  wall_lng?: number;
  wall_name?: string;
  crag_name?: string;
};

export type OutdoorListDetail = OutdoorList & {
  items: OutdoorListItem[];
};

export type RouteContainment = {
  list_id: string;
  item_id: string;
};
