// Mock indoor gym + 60 active routes + 4 archived.
//
// ⚠️ Window D1-FU (2026-05-06): the same payload now ships in BE via
// alembic migration `d1fu_seed_demo_gym_catalog` (uuid5-deterministic
// IDs), and `EXPO_PUBLIC_MOCK_GYM_CATALOG` defaults to 0. This file is
// retained as a dev escape hatch only — set the flag to "1" if BE is
// unreachable and you need to bring up gym pages without a backend.
// Note that mock UUIDs here (`gr-ws-east-000` etc.) are NOT valid
// PG UUIDs, so any logs created in mock mode never round-trip to BE.
//
// Generator is procedural so changing wall/grade distribution is one
// config edit, not a 60-line patch.

import type { BetaOut } from '../outdoor/betaApi';
import type {
  Gym,
  GymRoute,
  GymRouteAscent,
  GymRouteRating,
  GymRouteStatus,
  WallSection,
} from './types';

export const MOCK_GYM_ID = '00000000-0000-0000-0000-000000000001';

const COLORS = ['blue', 'yellow', 'red', 'green', 'black'] as const;
const SETTERS = ['Alex', 'Maya', 'Chris'] as const;

// Anchor "today" so the mock data is reproducible across runs and the
// NEW filter (set_date < 14 days) is deterministic in tests/screenshots.
const TODAY = new Date();

function isoDateMinusDays(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isoDatetimeMinusDays(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// Deterministic pseudo-random: keep mock layouts stable between hot
// reloads so the GradeSuggestionCard doesn't flicker numbers.
function rand(seed: number, lo: number, hi: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  const fraction = x - Math.floor(x);
  return Math.floor(lo + fraction * (hi - lo + 1));
}

// V-scale and YDS → grade_score (mirrors services/grade_system.py).
function scoreFor(grade: string): number {
  if (grade.startsWith('V')) return parseInt(grade.slice(1), 10);
  // YDS: 5.7→57, 5.10a→100, 5.10b→101, 5.11a→110, 5.11b→111, 5.12a→120
  const m = grade.match(/^5\.(\d{1,2})([a-d])?$/);
  if (!m) return 0;
  const major = parseInt(m[1], 10);
  const suffix = m[2] ? { a: 0, b: 1, c: 2, d: 3 }[m[2] as 'a' | 'b' | 'c' | 'd'] : 0;
  return major < 10 ? major + 50 : major * 10 + suffix;
}

type WallConfig = {
  id: string;
  name: string;
  style: 'boulder' | 'rope';
  floor_plan_x: number;
  floor_plan_y: number;
  /** grade → count */
  gradeDist: Record<string, number>;
  /** Window INDOOR_SET / SET-P3 — when true, every route on this wall gets
   *  a deterministic grid pin_x/pin_y so the floor plan's per-wall real-pin
   *  fallback can be exercised in mock mode (Phase 1 backend isn't deployed
   *  yet, so the real-coords path is otherwise untestable). Only ONE wall
   *  is seeded so the contrast is obvious: East = neat real-coord grid,
   *  every other wall = legacy scattered dots, with no mixing. */
  seedPins?: boolean;
};

const PIN_GRID_COLS = 4;

const WALL_CONFIGS: WallConfig[] = [
  {
    id: 'ws-east',
    name: 'East Wall',
    style: 'boulder',
    floor_plan_x: 0.20,
    floor_plan_y: 0.55,
    gradeDist: { V0: 2, V1: 2, V2: 3, V3: 3, V4: 2, V5: 2, V6: 1 },  // 15
    seedPins: true,
  },
  {
    id: 'ws-west',
    name: 'West Wall',
    style: 'rope',
    floor_plan_x: 0.50,
    floor_plan_y: 0.25,
    gradeDist: {
      '5.8': 3, '5.9': 4, '5.10a': 4, '5.10b': 4, '5.10c': 4, '5.10d': 3, '5.11a': 3,
    },  // 25
  },
  {
    id: 'ws-slab',
    name: 'Slab',
    style: 'boulder',
    floor_plan_x: 0.75,
    floor_plan_y: 0.45,
    gradeDist: { V0: 2, V1: 2, V2: 2, V3: 1, V4: 1 },  // 8
  },
  {
    id: 'ws-topout',
    name: 'Topout',
    style: 'boulder',
    floor_plan_x: 0.30,
    floor_plan_y: 0.30,
    gradeDist: { V3: 2, V4: 3, V5: 3, V6: 2, V7: 2 },  // 12
  },
];

function makeWallSections(): WallSection[] {
  return WALL_CONFIGS.map((w, idx) => {
    const route_count = Object.values(w.gradeDist).reduce((a, b) => a + b, 0);
    return {
      id: w.id,
      gym_id: MOCK_GYM_ID,
      name: w.name,
      style: w.style,
      floor_plan_x: w.floor_plan_x,
      floor_plan_y: w.floor_plan_y,
      sort_order: idx,
      status: 'approved',
      route_count,
    };
  });
}

function makeRoute(args: {
  index: number;
  wall: WallConfig;
  grade: string;
  status?: GymRouteStatus;
  archivedDaysAgo?: number;
}): GymRoute {
  const { index, wall, grade } = args;
  const status = args.status ?? 'active';
  const setDateDays = index % 5 === 0 ? rand(index, 0, 13) : rand(index, 14, 42);  // ~20% NEW
  const hasRating = index % 5 !== 0;  // 80% have ratings
  const isClassic = index % 6 === 0;  // ~16% classics

  // SET-P3 — deterministic grid pins for seeded walls only. Laid out near
  // the wall's floor_plan anchor so the grid reads as "this wall".
  const pinFields =
    wall.seedPins && status === 'active'
      ? {
          pin_x: 0.08 + (index % PIN_GRID_COLS) * 0.085,
          pin_y: 0.4 + Math.floor(index / PIN_GRID_COLS) * 0.07,
        }
      : {};

  return {
    id: `gr-${wall.id}-${index.toString().padStart(3, '0')}`,
    wall_section_id: wall.id,
    name: `${COLORS[index % COLORS.length]} ${grade}`,
    color: COLORS[index % COLORS.length],
    grade_text: grade,
    grade_system: grade.startsWith('V') ? 'vscale' : 'yds',
    grade_score: scoreFor(grade),
    style: wall.style,
    wall_close_up_url: null,
    photos: null,
    setter_name: SETTERS[index % SETTERS.length],
    set_date: isoDateMinusDays(setDateDays),
    status,
    archived_at:
      status === 'archived' && args.archivedDaysAgo !== undefined
        ? isoDatetimeMinusDays(args.archivedDaysAgo)
        : null,
    stars: hasRating ? Math.round((3.0 + rand(index + 7, 0, 4) * 0.5) * 10) / 10 : null,
    rating_count: hasRating ? rand(index + 11, 1, 30) : 0,
    send_count: isClassic ? rand(index + 13, 12, 50) : rand(index + 13, 0, 18),
    description: null,
    created_at: isoDatetimeMinusDays(setDateDays),
    updated_at: isoDatetimeMinusDays(setDateDays),
    ...pinFields,
    // SET-P3 — deterministic routesetter metadata on a subset of active
    // routes so the detail page's movement chips / benchmark + expiry
    // badges are exercisable in mock mode.
    ...(status === 'active'
      ? {
          is_benchmark: index % 7 === 0,
          movement_tags:
            index % 3 === 0
              ? {
                  grip: ['crimp', 'sloper'].slice(0, (index % 2) + 1),
                  footwork: index % 2 === 0 ? ['heel hook'] : [],
                  style: ['powerful'],
                  usage: [],
                }
              : null,
          // isoDateMinusDays(-6) = 6 days in the future.
          expiry_date:
            index % 9 === 0
              ? isoDateMinusDays(3) // already expired
              : index % 4 === 0
                ? isoDateMinusDays(-6) // expires soon
                : null,
        }
      : {}),
  };
}

function makeActiveRoutes(): GymRoute[] {
  const routes: GymRoute[] = [];
  for (const wall of WALL_CONFIGS) {
    let i = 0;
    for (const [grade, count] of Object.entries(wall.gradeDist)) {
      for (let n = 0; n < count; n++) {
        routes.push(makeRoute({ index: i, wall, grade }));
        i += 1;
      }
    }
  }
  return routes;
}

// 4 archived (East 1, West 2, Slab 0, Topout 1). Different IDs so they
// don't collide with active route IDs.
function makeArchivedRoutes(): GymRoute[] {
  const east = WALL_CONFIGS[0];
  const west = WALL_CONFIGS[1];
  const topout = WALL_CONFIGS[3];
  return [
    makeRoute({ index: 100, wall: east, grade: 'V4', status: 'archived', archivedDaysAgo: 35 }),
    makeRoute({ index: 101, wall: west, grade: '5.10b', status: 'archived', archivedDaysAgo: 42 }),
    makeRoute({ index: 102, wall: west, grade: '5.11a', status: 'archived', archivedDaysAgo: 50 }),
    makeRoute({ index: 103, wall: topout, grade: 'V6', status: 'archived', archivedDaysAgo: 60 }),
  ].map((r, i) => ({
    ...r,
    id: `gr-archived-${i.toString().padStart(3, '0')}`,
  }));
}

export const mockGym: Gym = {
  id: MOCK_GYM_ID,
  name: 'ClimMate Test Gym',
  description: '测试岩馆 / Mock gym for system validation',
  floor_plan_url: 'asset:///mock-gyms/test-gym-floor.png',
  hours: {
    mon: '10:00-22:00',
    tue: '10:00-22:00',
    wed: '10:00-22:00',
    thu: '10:00-22:00',
    fri: '10:00-23:00',
    sat: '09:00-23:00',
    sun: '09:00-22:00',
  },
  amenities: ['showers', 'lockers', 'yoga_room', 'weights', 'cafe'],
  partnership_status: 'active',
};

export const mockWallSections: WallSection[] = makeWallSections();
export const mockGymRoutes: GymRoute[] = [
  ...makeActiveRoutes(),
  ...makeArchivedRoutes(),
];

// ── Window AS mock helpers — ascents / ratings / betas ────────────
//
// Procedural so the same routeId always produces the same lists across
// hot reloads. We don't seed every route; only routes with rating_count
// or send_count > 0 get populated entries (matching how a fresh gym
// would look the day after a setting cycle).

const MOCK_USERS = ['alice', 'bryan', 'cleo', 'diego', 'emi'] as const;
const MOCK_FEELS: Array<'soft' | 'solid' | 'hard'> = ['soft', 'solid', 'hard'];

function pseudoSeed(routeId: string): number {
  // Hash the routeId to a stable integer so each route gets its own
  // reproducible distribution of ascents/ratings.
  let h = 0;
  for (let i = 0; i < routeId.length; i++) {
    h = (h * 31 + routeId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function mockGymAscents(routeId: string): GymRouteAscent[] {
  const route = mockGymRoutes.find((r) => r.id === routeId);
  if (!route) return [];
  const seed = pseudoSeed(routeId);
  const count = Math.min(route.send_count, 8);
  const out: GymRouteAscent[] = [];
  for (let i = 0; i < count; i++) {
    const isSend = i % 4 !== 3;
    const username = MOCK_USERS[(seed + i) % MOCK_USERS.length];
    out.push({
      id: `mock-asc-${routeId}-${i}`,
      user_id: `mock-user-${i}`,
      username,
      result: isSend
        ? i === 0
          ? 'flash'
          : 'send'
        : 'attempt',
      grade_text: route.grade_text,
      attempts: rand(seed + i, 1, 4),
      date: isoDateMinusDays(rand(seed + i + 31, 0, 28)),
      note: i % 3 === 0 ? 'fun line' : null,
    });
  }
  return out;
}

export function mockGymRatings(routeId: string): GymRouteRating[] {
  const route = mockGymRoutes.find((r) => r.id === routeId);
  if (!route || !route.rating_count) return [];
  const seed = pseudoSeed(routeId);
  const count = Math.min(route.rating_count, 5);
  const out: GymRouteRating[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `mock-rating-${routeId}-${i}`,
      route_id: routeId,
      user_id: `mock-user-${i}`,
      stars: 3 + ((seed + i) % 3),
      comment:
        i % 2 === 0
          ? `${MOCK_FEELS[(seed + i) % 3]} for the grade — fun moves`
          : null,
      created_at: isoDatetimeMinusDays(rand(seed + i + 17, 0, 21)),
      username: MOCK_USERS[(seed + i) % MOCK_USERS.length],
    });
  }
  return out;
}

export function mockGymBetas(
  routeId: string,
  _params: { limit?: number; offset?: number } = {},
): BetaOut[] {
  // Mock has no real video URLs — return empty so the UI shows the
  // empty state. Switching this on after we ship a sample R2 video
  // would be a one-line edit (build a few BetaOut rows pointing at
  // a hosted MP4).
  void _params;
  void routeId;
  return [];
}
