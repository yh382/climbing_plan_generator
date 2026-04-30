// Indoor gym catalog (Window AR)
// Mirrors backend schemas/gym_catalog.py shapes 1:1 so api responses
// can be assigned without conversion.

export type GymRouteStatus = 'active' | 'archived' | 'pending' | 'rejected';
export type GymStyle = 'boulder' | 'rope';
export type GymWallStyle = GymStyle | 'mixed';
export type GymGradeSystem = 'vscale' | 'yds' | 'font' | 'french';

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
