// Mock indoor gym + 60 active routes + 4 archived. Used when
// EXPO_PUBLIC_MOCK_GYM_CATALOG=1 so the frontend can be developed
// without seeded backend data.
//
// Generator is procedural so changing wall/grade distribution is one
// config edit, not a 60-line patch.

import type { Gym, GymRoute, GymRouteStatus, WallSection } from './types';

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
};

const WALL_CONFIGS: WallConfig[] = [
  {
    id: 'ws-east',
    name: 'East Wall',
    style: 'boulder',
    floor_plan_x: 0.20,
    floor_plan_y: 0.55,
    gradeDist: { V0: 2, V1: 2, V2: 3, V3: 3, V4: 2, V5: 2, V6: 1 },  // 15
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
