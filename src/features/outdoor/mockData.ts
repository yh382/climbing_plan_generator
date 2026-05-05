// src/features/outdoor/mockData.ts
// Mock datasets: Wasatch Range (Utah) + 阳朔 (Guangxi)
// Keyed by parent ID for O(1) lookup
//
// IDs are deterministic UUID5(NAMESPACE_DNS, "climmate.mock.<slug>") so they
// match `climbing_plan_backend/scripts/seed_outdoor_mock.py`. Run that script
// against the dev DB once to make backend writes (POST /climb-logs,
// /ascents, /ratings) work against this mock catalog.

import type { Area, Crag, Sector, Wall, OutdoorRoute } from './types';

// Slug → UUID5 lookup (mirrors backend `_u(slug)` helper)
const ID = {
  wasatch:    '41d2c2ec-00a4-5be5-ad02-bc83a8aa6c7e',
  yangshuo:   '6bfad76d-679b-50ce-a6ba-fddde1d229d5',
  lcc:        '447c73ed-38d2-5225-a975-1f3c73d16c77',
  bcc:        'ab50d4d9-5bde-5cb7-a46a-b4e5f584f72c',
  afc:        '85be30c8-2170-5af6-8c90-8eda2899c814',
  baishan:    'a1650fb6-73fb-537e-85e4-124be1dd3345',
  fin:        '2e552173-71f5-52d8-804b-62e3754ede29',
  gate:       '7c13e526-39b4-584c-a903-d7e06b2808bd',
  jidanshan:  '7700dd0d-a15b-5918-a882-66894d2cef08',
  finNorth:   '893ef165-4fb4-5b7c-bee2-d52c6b522741',
  finSouth:   '60bc04ba-0c3b-594e-86d3-f2e5b38f0548',
  gateMain:   '65cb7c14-112d-5b64-8122-a38c8553066a',
  menghuan:   '4109628b-89af-5941-b311-1d5adee52fe1',
  riluo:      '073e0037-67d3-587e-86af-6b54dcacfeb1',
  r1: '879ce6a4-805c-5d8c-aaa1-b250344d27d7',
  r2: 'aee34a4c-28df-58a9-8168-07dc6ed9c403',
  r3: '789b8e9e-124b-59bd-8b3c-60a7febc4d49',
  r4: '6127b902-bfc3-58a4-bed8-488d0afe6980',
  r5: '1f2b2af7-5ba7-5841-86f1-c3ca76e4c99b',
  r10: '54067c33-3fa3-5a0e-b590-7cfca84b531f',
  r6: '628d6929-2c2c-5b4d-9bba-1adab34cd652',
  r7: 'c05c8ab8-0c94-521a-93e0-81835c291e24',
  r8: '972c13cb-d439-5122-945a-372f830f753d',
} as const;

// ---- Areas ----

export const MOCK_AREAS: Area[] = [
  {
    id: ID.wasatch,
    name: 'Wasatch Range',
    name_en: 'Wasatch Range',
    region: 'Utah',
    country: 'US',
    lat: 40.59,
    lng: -111.64,
    description: "World-class climbing in Utah's Wasatch Mountains",
    best_seasons: ['Apr', 'May', 'Jun', 'Sep', 'Oct'],
    status: 'approved',
    route_count: 200,
    crag_count: 3,
  },
  {
    id: ID.yangshuo,
    name: '阳朔',
    name_en: 'Yangshuo',
    region: '广西桂林',
    country: 'CN',
    lat: 24.77,
    lng: 110.49,
    description: '桂林山水中的世界级运动攀岩圣地',
    approach: '从阳朔镇出发，大部分岩壁 10-30 分钟可达。',
    approach_time_min: 20,
    approach_difficulty: 'easy',
    transport: {
      driving: '从桂林沿 G321 向南 65km，约 1.5 小时',
      public_transit: '桂林汽车站乘班车到阳朔，约 1.5 小时',
      parking: { lat: 24.7234, lng: 110.4892, description: '月亮山停车场', capacity: '约 30 辆' },
      nearest_city: '桂林',
      nearest_city_distance_km: 65,
    },
    accommodation: [
      { name: '月亮山客栈', type: 'hostel', distance_km: 0.5, price_range: '¥50-100', note: '攀岩者聚集地' },
    ],
    best_seasons: ['Oct', 'Nov', 'Dec', 'Mar', 'Apr'],
    safety_notes: '雨后岩壁湿滑，至少等 2 小时再攀爬。',
    emergency_info: '最近医院：阳朔人民医院，约 15km',
    status: 'approved',
    route_count: 1000,
    crag_count: 13,
  },
];

// ---- Crags (keyed by area_id) ----

export const MOCK_CRAGS: Record<string, Crag[]> = {
  [ID.wasatch]: [
    { id: ID.lcc, area_id: ID.wasatch, name: 'Little Cottonwood Canyon', lat: 40.57, lng: -111.77, status: 'approved', route_count: 85, sector_count: 3 },
    { id: ID.bcc, area_id: ID.wasatch, name: 'Big Cottonwood Canyon', lat: 40.62, lng: -111.72, status: 'approved', route_count: 60, sector_count: 2 },
    { id: ID.afc, area_id: ID.wasatch, name: 'American Fork Canyon', lat: 40.41, lng: -111.75, status: 'approved', route_count: 55, sector_count: 2 },
  ],
  [ID.yangshuo]: [
    { id: ID.baishan, area_id: ID.yangshuo, name: '白山地区', name_en: 'Baishan Area', lat: 24.72, lng: 110.49, status: 'approved', route_count: 65, sector_count: 6 },
  ],
};

// ---- Sectors (keyed by crag_id) ----

export const MOCK_SECTORS: Record<string, Sector[]> = {
  [ID.lcc]: [
    { id: ID.fin, crag_id: ID.lcc, name: 'The Fin', lat: 40.575, lng: -111.772, sort_order: 1, status: 'approved', route_count: 25, wall_count: 2 },
    { id: ID.gate, crag_id: ID.lcc, name: 'Gate Buttress', lat: 40.58, lng: -111.76, sort_order: 2, status: 'approved', route_count: 30, wall_count: 2 },
  ],
  [ID.baishan]: [
    { id: ID.jidanshan, crag_id: ID.baishan, name: '鸡蛋山', name_en: 'Egg Mountain', lat: 24.72, lng: 110.49, sort_order: 1, status: 'approved', route_count: 47, wall_count: 4 },
  ],
};

// ---- Walls (keyed by sector_id) ----

export const MOCK_WALLS: Record<string, Wall[]> = {
  [ID.fin]: [
    { id: ID.finNorth, sector_id: ID.fin, name: 'North Face', lat: 40.576, lng: -111.773, orientation: 'N', sort_order: 1, status: 'approved', route_count: 15 },
    { id: ID.finSouth, sector_id: ID.fin, name: 'South Face', lat: 40.574, lng: -111.771, orientation: 'S', sort_order: 2, status: 'approved', route_count: 10 },
  ],
  [ID.gate]: [
    { id: ID.gateMain, sector_id: ID.gate, name: 'Main Wall', lat: 40.581, lng: -111.761, orientation: 'W', sort_order: 1, status: 'approved', route_count: 18 },
  ],
  [ID.jidanshan]: [
    { id: ID.menghuan, sector_id: ID.jidanshan, name: '梦幻墙', name_en: 'Fantasy Wall', lat: 24.721, lng: 110.491, orientation: 'S', sort_order: 1, status: 'approved', route_count: 12 },
    { id: ID.riluo, sector_id: ID.jidanshan, name: '日落墙', name_en: 'Sunset Wall', lat: 24.722, lng: 110.492, orientation: 'W', sort_order: 2, status: 'approved', route_count: 8 },
  ],
};

// ---- Routes (keyed by wall_id) ----

export const MOCK_ROUTES: Record<string, OutdoorRoute[]> = {
  [ID.finNorth]: [
    { id: ID.r1, wall_id: ID.finNorth, name: 'Lightning Bolt', grade_text: '5.10a', grade_system: 'yds', grade_score: 100, length_m: 25, pitches: 1, bolts: 8, style: 'sport', stars: 4.0, rating_count: 12, send_count: 45, attempt_count: 89, sector_name: 'The Fin', wall_name: 'North Face' },
    { id: ID.r2, wall_id: ID.finNorth, name: 'Schoolroom', grade_text: '5.7', grade_system: 'yds', grade_score: 70, length_m: 20, pitches: 1, style: 'trad', stars: 3.5, rating_count: 8, send_count: 120, attempt_count: 150, sector_name: 'The Fin', wall_name: 'North Face' },
    { id: ID.r3, wall_id: ID.finNorth, name: 'Green Adjective', grade_text: '5.9', grade_system: 'yds', grade_score: 90, length_m: 30, pitches: 1, bolts: 6, style: 'sport', stars: 4.5, rating_count: 20, send_count: 80, attempt_count: 130, sector_name: 'The Fin', wall_name: 'North Face' },
  ],
  [ID.finSouth]: [
    { id: ID.r4, wall_id: ID.finSouth, name: 'Bong Eater', grade_text: '5.8', grade_system: 'yds', grade_score: 80, length_m: 22, pitches: 1, style: 'trad', stars: 3.0, rating_count: 5, send_count: 30, attempt_count: 45, sector_name: 'The Fin', wall_name: 'South Face' },
    { id: ID.r5, wall_id: ID.finSouth, name: 'The Coffin', grade_text: '5.11b', grade_system: 'yds', grade_score: 113, length_m: 28, pitches: 1, bolts: 9, style: 'sport', stars: 4.2, rating_count: 15, send_count: 25, attempt_count: 70, sector_name: 'The Fin', wall_name: 'South Face' },
  ],
  [ID.gateMain]: [
    { id: ID.r10, wall_id: ID.gateMain, name: "Goodro's Wall", grade_text: '5.10b', grade_system: 'yds', grade_score: 102, length_m: 24, pitches: 1, bolts: 7, style: 'sport', stars: 3.8, rating_count: 10, send_count: 40, attempt_count: 65, sector_name: 'Gate Buttress', wall_name: 'Main Wall' },
  ],
  [ID.menghuan]: [
    { id: ID.r6, wall_id: ID.menghuan, name: '鸭子', name_en: 'Duck', grade_text: '5.11b', grade_system: 'yds', grade_score: 113, length_m: 20, pitches: 1, bolts: 7, style: 'sport', stars: 3.5, rating_count: 8, send_count: 15, attempt_count: 40, sector_name: '鸡蛋山', wall_name: '梦幻墙', description: '技巧型路线，核心在第三把到第五把' },
    { id: ID.r7, wall_id: ID.menghuan, name: '飞鸟', name_en: 'Flying Bird', grade_text: '5.10c', grade_system: 'yds', grade_score: 103, length_m: 18, pitches: 1, bolts: 6, style: 'sport', stars: 3.0, rating_count: 5, send_count: 22, attempt_count: 35, sector_name: '鸡蛋山', wall_name: '梦幻墙' },
  ],
  [ID.riluo]: [
    { id: ID.r8, wall_id: ID.riluo, name: '夕阳红', name_en: 'Sunset Red', grade_text: '5.10a', grade_system: 'yds', grade_score: 100, length_m: 15, pitches: 1, bolts: 5, style: 'sport', stars: 3.0, rating_count: 3, send_count: 10, attempt_count: 15, sector_name: '鸡蛋山', wall_name: '日落墙' },
  ],
};
