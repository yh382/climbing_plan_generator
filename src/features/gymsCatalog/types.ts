// Indoor gym catalog (Window AR)
// Mirrors backend schemas/gym_catalog.py shapes 1:1 so api responses
// can be assigned without conversion.

// `planned` (Window INDOOR_SET / SET-P3) = KAYA "Not Set": scheduled but
// not yet built. Setter-only — the climber app never requests it (gym
// lists default to status:'active'), so planned routes stay hidden here.
export type GymRouteStatus =
  | 'active'
  | 'archived'
  | 'pending'
  | 'rejected'
  | 'planned';
export type GymStyle = 'boulder' | 'rope';
export type GymWallStyle = GymStyle | 'mixed';
export type GymGradeSystem = 'vscale' | 'yds' | 'font' | 'french';

/** Structured movement-characteristic tags (Window INDOOR_SET). Mirrors
 *  backend `MovementTags` — single source of truth is the backend schema;
 *  the app only renders whatever string values come back per category. */
export type MovementTags = {
  grip?: string[];
  footwork?: string[];
  style?: string[];
  usage?: string[];
};

/** Zone region on the whole-gym floor plan, 0..1 normalized (Window
 *  INDOOR_SET). Used by the setter pin editor + future "tap zone → zoom"
 *  affordance; the app reads it opportunistically. */
export type WallBbox = { x: number; y: number; w: number; h: number };

export type GymHours = Partial<Record<
  'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun',
  string
>>;

export type Gym = {
  id: string;
  name: string;
  description?: string | null;
  floor_plan_url?: string | null;
  hours?: GymHours | null;
  amenities?: string[] | null;
  partnership_status: 'none' | 'trial' | 'active' | 'ended';
  /** Mock-only convenience: a bundled require() result that the
   *  GymFloorPlanView prefers over the URL string. Never set on real
   *  backend payloads. */
  __localFloorPlan?: number;
};

export type WallSection = {
  id: string;
  gym_id: string;
  name: string;
  style: GymWallStyle;
  floor_plan_x: number;   // 0..1
  floor_plan_y: number;   // 0..1
  sort_order: number;
  status: string;
  route_count: number;
  /** Window INDOOR_SET — zone region box on the whole-gym floor plan.
   *  Optional: absent on pre-Phase-1 backends. */
  bbox?: WallBbox | null;
};

export type GymRoute = {
  id: string;
  wall_section_id: string;
  name: string | null;
  color: string | null;
  grade_text: string;
  grade_system: GymGradeSystem;
  grade_score: number | null;
  style: GymStyle;
  wall_close_up_url: string | null;
  photos: Array<{ url: string; caption?: string }> | null;
  setter_name: string | null;
  set_date: string | null;       // ISO date
  status: GymRouteStatus;
  archived_at: string | null;    // ISO datetime
  stars: number | null;
  rating_count: number;
  send_count: number;
  description: string | null;
  created_at: string;
  updated_at: string;
  // ── Routesetter fields (Window INDOOR_SET / SET-P3) ──────────────
  // All optional: pre-Phase-1 backends (current prod) omit them entirely,
  // so a route without these reads as "not pinned / no metadata" and the
  // floor plan falls back to the legacy scatter algorithm (see
  // GymFloorPlanView per-wall fallback). Do NOT serialize these into the
  // logs outbox / LocalDayLogItem — display-only.
  /** Whole-gym floor-plan pin, 0..1. Absolute coords (vs the wall-center
   *  scatter of deriveRoutePosition) — never mix the two on one wall. */
  pin_x?: number | null;
  pin_y?: number | null;
  expiry_date?: string | null;     // ISO date — planned reset/strip date
  setter_user_id?: string | null;  // structured setter; setter_name = guest fallback
  movement_tags?: MovementTags | null;
  is_benchmark?: boolean;
  // B2 follow-up: parent gym ancestry, populated by GET /routes/{id}.
  // Used by catalog Send to label the auto-started session with the
  // actual gym name instead of the literal "Gym" fallback.
  gym_id?: string | null;
  gym_name?: string | null;
};

export type GymRouteListParams = {
  status?: GymRouteStatus | 'all';
  color?: string;
  setter?: string;
  style?: GymStyle;
};

export type GymRouteCreatePayload = {
  name?: string | null;
  color?: string | null;
  grade_text: string;
  grade_system: GymGradeSystem;
  style: GymStyle;
  wall_close_up_url?: string | null;
  photos?: Array<{ url: string; caption?: string }> | null;
  setter_name?: string | null;
  set_date?: string | null;
  description?: string | null;
};

// Mirror of outdoor's RouteAscent / RouteRating shapes — same Pydantic
// schemas on the backend so /gym/routes/{id}/ascents and /gym/routes/{id}/ratings
// can drop straight into the same FE rendering paths used by outdoor.
export type GymRouteAscent = {
  id: string;
  user_id: string;
  username: string | null;
  result: 'send' | 'flash' | 'onsight' | 'attempt';
  grade_text: string | null;
  /** Window D1_D2_E2 — echoed by /gym/routes/{id}/ascents so
   *  GradeSuggestionCard can plot a histogram + majority-feel pill. */
  feel?: 'soft' | 'solid' | 'hard' | null;
  style_tags?: string[] | null;
  attempts: number | null;
  date: string;
  note: string | null;
};

export type GymRouteRating = {
  id: string;
  route_id: string;
  user_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
  username: string | null;
};

export type GymRouteRatingPayload = {
  stars: number;
  comment?: string | null;
};
