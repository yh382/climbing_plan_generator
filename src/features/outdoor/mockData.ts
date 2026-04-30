// src/features/outdoor/mockData.ts
// Mock datasets: Wasatch Range (Utah) + 阳朔 (Guangxi)
// Keyed by parent ID for O(1) lookup

import type { Area, Crag, Sector, Wall, OutdoorRoute, RouteAscent, RouteRating } from './types';

// ---- Areas ----

export const MOCK_AREAS: Area[] = [
  {
    id: 'mock-wasatch',
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
    id: 'mock-yangshuo',
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
  'mock-wasatch': [
    { id: 'mock-lcc', area_id: 'mock-wasatch', name: 'Little Cottonwood Canyon', lat: 40.57, lng: -111.77, status: 'approved', route_count: 85, sector_count: 3 },
    { id: 'mock-bcc', area_id: 'mock-wasatch', name: 'Big Cottonwood Canyon', lat: 40.62, lng: -111.72, status: 'approved', route_count: 60, sector_count: 2 },
    { id: 'mock-afc', area_id: 'mock-wasatch', name: 'American Fork Canyon', lat: 40.41, lng: -111.75, status: 'approved', route_count: 55, sector_count: 2 },
  ],
  'mock-yangshuo': [
    { id: 'mock-baishan', area_id: 'mock-yangshuo', name: '白山地区', name_en: 'Baishan Area', lat: 24.72, lng: 110.49, status: 'approved', route_count: 65, sector_count: 6 },
  ],
};

// ---- Sectors (keyed by crag_id) ----

export const MOCK_SECTORS: Record<string, Sector[]> = {
  'mock-lcc': [
    { id: 'mock-fin', crag_id: 'mock-lcc', name: 'The Fin', lat: 40.575, lng: -111.772, sort_order: 1, status: 'approved', route_count: 25, wall_count: 2 },
    { id: 'mock-gate', crag_id: 'mock-lcc', name: 'Gate Buttress', lat: 40.58, lng: -111.76, sort_order: 2, status: 'approved', route_count: 30, wall_count: 2 },
  ],
  'mock-baishan': [
    { id: 'mock-jidanshan', crag_id: 'mock-baishan', name: '鸡蛋山', name_en: 'Egg Mountain', lat: 24.72, lng: 110.49, sort_order: 1, status: 'approved', route_count: 47, wall_count: 4 },
  ],
};

// ---- Walls (keyed by sector_id) ----

export const MOCK_WALLS: Record<string, Wall[]> = {
  'mock-fin': [
    { id: 'mock-fin-north', sector_id: 'mock-fin', name: 'North Face', lat: 40.576, lng: -111.773, orientation: 'N', sort_order: 1, status: 'approved', route_count: 15 },
    { id: 'mock-fin-south', sector_id: 'mock-fin', name: 'South Face', lat: 40.574, lng: -111.771, orientation: 'S', sort_order: 2, status: 'approved', route_count: 10 },
  ],
  'mock-gate': [
    { id: 'mock-gate-main', sector_id: 'mock-gate', name: 'Main Wall', lat: 40.581, lng: -111.761, orientation: 'W', sort_order: 1, status: 'approved', route_count: 18 },
  ],
  'mock-jidanshan': [
    { id: 'mock-menghuanwall', sector_id: 'mock-jidanshan', name: '梦幻墙', name_en: 'Fantasy Wall', lat: 24.721, lng: 110.491, orientation: 'S', sort_order: 1, status: 'approved', route_count: 12 },
    { id: 'mock-riluowall', sector_id: 'mock-jidanshan', name: '日落墙', name_en: 'Sunset Wall', lat: 24.722, lng: 110.492, orientation: 'W', sort_order: 2, status: 'approved', route_count: 8 },
  ],
};

// ---- Routes (keyed by wall_id) ----

export const MOCK_ROUTES: Record<string, OutdoorRoute[]> = {
  'mock-fin-north': [
    { id: 'r1', wall_id: 'mock-fin-north', name: 'Lightning Bolt', grade_text: '5.10a', grade_system: 'yds', grade_score: 100, length_m: 25, pitches: 1, bolts: 8, style: 'sport', stars: 4.0, rating_count: 12, send_count: 45, attempt_count: 89, sector_name: 'The Fin', wall_name: 'North Face' },
    { id: 'r2', wall_id: 'mock-fin-north', name: 'Schoolroom', grade_text: '5.7', grade_system: 'yds', grade_score: 70, length_m: 20, pitches: 1, style: 'trad', stars: 3.5, rating_count: 8, send_count: 120, attempt_count: 150, sector_name: 'The Fin', wall_name: 'North Face' },
    { id: 'r3', wall_id: 'mock-fin-north', name: 'Green Adjective', grade_text: '5.9', grade_system: 'yds', grade_score: 90, length_m: 30, pitches: 1, bolts: 6, style: 'sport', stars: 4.5, rating_count: 20, send_count: 80, attempt_count: 130, sector_name: 'The Fin', wall_name: 'North Face' },
  ],
  'mock-fin-south': [
    { id: 'r4', wall_id: 'mock-fin-south', name: 'Bong Eater', grade_text: '5.8', grade_system: 'yds', grade_score: 80, length_m: 22, pitches: 1, style: 'trad', stars: 3.0, rating_count: 5, send_count: 30, attempt_count: 45, sector_name: 'The Fin', wall_name: 'South Face' },
    { id: 'r5', wall_id: 'mock-fin-south', name: 'The Coffin', grade_text: '5.11b', grade_system: 'yds', grade_score: 113, length_m: 28, pitches: 1, bolts: 9, style: 'sport', stars: 4.2, rating_count: 15, send_count: 25, attempt_count: 70, sector_name: 'The Fin', wall_name: 'South Face' },
  ],
  'mock-gate-main': [
    { id: 'r10', wall_id: 'mock-gate-main', name: 'Goodro\'s Wall', grade_text: '5.10b', grade_system: 'yds', grade_score: 102, length_m: 24, pitches: 1, bolts: 7, style: 'sport', stars: 3.8, rating_count: 10, send_count: 40, attempt_count: 65, sector_name: 'Gate Buttress', wall_name: 'Main Wall' },
  ],
  'mock-menghuanwall': [
    { id: 'r6', wall_id: 'mock-menghuanwall', name: '鸭子', name_en: 'Duck', grade_text: '5.11b', grade_system: 'yds', grade_score: 113, length_m: 20, pitches: 1, bolts: 7, style: 'sport', stars: 3.5, rating_count: 8, send_count: 15, attempt_count: 40, sector_name: '鸡蛋山', wall_name: '梦幻墙', description: '技巧型路线，核心在第三把到第五把' },
    { id: 'r7', wall_id: 'mock-menghuanwall', name: '飞鸟', name_en: 'Flying Bird', grade_text: '5.10c', grade_system: 'yds', grade_score: 103, length_m: 18, pitches: 1, bolts: 6, style: 'sport', stars: 3.0, rating_count: 5, send_count: 22, attempt_count: 35, sector_name: '鸡蛋山', wall_name: '梦幻墙' },
  ],
  'mock-riluowall': [
    { id: 'r8', wall_id: 'mock-riluowall', name: '夕阳红', name_en: 'Sunset Red', grade_text: '5.10a', grade_system: 'yds', grade_score: 100, length_m: 15, pitches: 1, bolts: 5, style: 'sport', stars: 3.0, rating_count: 3, send_count: 10, attempt_count: 15, sector_name: '鸡蛋山', wall_name: '日落墙' },
  ],
};

// ---- Social mock data ----

export const MOCK_ASCENTS: RouteAscent[] = [
  { id: 'a1', user_id: 'u1', username: 'alice', result: 'send', attempts: 3, date: '2026-04-14', note: 'Finally redpointed!' },
  { id: 'a2', user_id: 'u2', username: 'bob', result: 'flash', attempts: 1, date: '2026-04-13' },
  { id: 'a3', user_id: 'u3', username: 'eve', result: 'attempt', attempts: 8, date: '2026-04-10', note: 'Still projecting' },
];

export const MOCK_RATINGS: RouteRating[] = [
  { id: 'rt1', user_id: 'u1', username: 'alice', stars: 4, comment: 'Great sustained climbing, crux is at bolt 4-5', created_at: '2026-04-14T10:00:00Z' },
  { id: 'rt2', user_id: 'u2', username: 'bob', stars: 5, comment: 'Classic line, must-do!', created_at: '2026-04-13T14:00:00Z' },
];
