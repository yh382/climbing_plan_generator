// src/features/mapscreen/components/outdoor-area-sheet/shared.ts
//
// Shared helpers for OutdoorAreaInfoSheet subcomponents.
// Centralizes: theme color type alias + display_kind i18n labels +
// section label i18n keys so we don't repeat the switch/case in every
// subcomponent.

import type { useThemeColors } from '../../../../lib/useThemeColors';
import type { DisplayKind, OutdoorAreaListItem } from '../../../outdoor/types';

export type ThemeColors = ReturnType<typeof useThemeColors>;

/**
 * Minimal seed for instant-paint Hero before useAreaDetail lands.
 * Required: id + name + display_kind. Everything else fills sensible
 * defaults (so callers from search/saved-spots/pin-tap don't need to
 * construct a full OutdoorArea object).
 *
 * CD Phase 1a — moved here from OutdoorAreaInfoSheet so the seed type +
 * mapper survive that sheet's deletion in 1b. Two existing importers
 * (OutdoorAreaInfoSheet, CragMenuSheet) + the new tabbed OutdoorBrowseSheet
 * Overview tab all read from this neutral module.
 */
export type AreaSeedInput = {
  id: string;
  name: string;
  display_kind: DisplayKind;
  name_en?: string | null;
  lat?: number | null;
  lng?: number | null;
  cover_url?: string | null;
  /** When known (e.g. from CragOverview), surfaces as parent badge below
   *  the title until ancestors breadcrumb hydrates from detail. */
  parent_name_hint?: string | null;
  /** Coarse pin-time hints; replaced by detail once it loads. */
  direct_route_count?: number;
  subtree_route_count?: number;
  direct_child_count?: number;
};

/**
 * Maps a child row (`OutdoorAreaListItem`) into the sheet's seed shape.
 * Used by all sheet hosts to wire `onChildTap` → re-present with the child
 * as new browsing context (drill-in). Centralized here so the call site
 * stays a one-liner and the mapping stays consistent.
 *
 * Drill-in semantics: by definition a child row is a direct descendant
 * of currently-browsing, so the 4-case classifyAreaTap matrix collapses
 * to the trivial drill-in case — no extra dispatch needed.
 */
export function areaListItemToSeed(item: OutdoorAreaListItem): AreaSeedInput {
  return {
    id: item.id,
    name: item.name,
    display_kind: item.display_kind,
    name_en: item.name_en ?? null,
    lat: item.lat ?? null,
    lng: item.lng ?? null,
    direct_route_count: item.direct_route_count,
    subtree_route_count: item.subtree_route_count,
    direct_child_count: item.direct_child_count,
  };
}

type Tr = (zh: string, en: string) => string;

export function displayKindLabel(k: DisplayKind, tr: Tr): string {
  switch (k) {
    case 'country': return tr('国家', 'Country');
    case 'state':   return tr('州', 'State');
    case 'region':  return tr('地区', 'Region');
    case 'area':    return tr('区域', 'Area');
    case 'crag':    return tr('攀岩点', 'Crag');
    case 'wall':    return tr('岩壁', 'Wall');
  }
}

/** Common section header labels used across subcomponents. */
export const sheetLabels = {
  children: (tr: Tr) => tr('子区域', 'Sub-areas'),
  routes: (tr: Tr) => tr('路线', 'Routes'),
  approach: (tr: Tr) => tr('进山', 'Approach'),
  metadata: (tr: Tr) => tr('详情', 'About'),
  directRoutes: (tr: Tr) => tr('直接路线', 'Direct routes'),
  subtreeRoutes: (tr: Tr) => tr('全部路线', 'All routes'),
  emptyRoutes: (tr: Tr) => tr('暂无路线', 'No routes yet'),
  emptyChildren: (tr: Tr) => tr('无子区域', 'No sub-areas'),
  approximateLocation: (tr: Tr) => tr(
    '近似位置（基于路线坐标推算）',
    'Approximate location (derived from route coords)',
  ),
  save: (tr: Tr) => tr('保存', 'Save'),
  saved: (tr: Tr) => tr('已保存', 'Saved'),
  share: (tr: Tr) => tr('分享', 'Share'),
  openInMaps: (tr: Tr) => tr('在地图中打开', 'Open in Maps'),
  directions: (tr: Tr) => tr('导航', 'Directions'),
  source: (tr: Tr) => tr('数据源', 'Source'),
};

/** Compact pluralized route count label. */
export function routeCountLabel(n: number, tr: Tr): string {
  if (n === 0) return tr('无路线', 'No routes');
  if (n === 1) return tr('1 条路线', '1 route');
  return tr(`${n} 条路线`, `${n} routes`);
}

export function childCountLabel(n: number, tr: Tr): string {
  if (n === 0) return tr('无子区域', 'No sub-areas');
  if (n === 1) return tr('1 个子区域', '1 sub-area');
  return tr(`${n} 个子区域`, `${n} sub-areas`);
}
