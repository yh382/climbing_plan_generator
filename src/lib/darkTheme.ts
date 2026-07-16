// src/lib/darkTheme.ts
// Dark mode color overrides — matches theme.colors structure

import type { ThemeColors } from './theme';

export const darkColors: ThemeColors = {
  accent: '#306E6F',              // unchanged — brand color
  textOnAccent: '#FFFFFF',        // accent stays teal in dark → pair stays white
  // Window BY — dark base lifted off pure black to a dark grey (mirrors the
  // light off-white bg). The whole elevation ladder shifts up one notch so
  // cards still separate: bg #161618 → card #242426 → elevated #2C2C2E →
  // border #38383A. App-wide change — verify across dark screens.
  background: '#161618',          // dark grey base (was pure black)
  sheetBackground: '#242426',    // iOS elevated surface for sheets
  sheetCardBackground: '#2C2C2E', // card/input backgrounds inside sheets
  backgroundSecondary: '#242426', // iOS systemGroupedBackground dark
  cardDark: '#2C2C2E',           // iOS secondarySystemGroupedBackground dark
  cardDarkImage: '#3A3A3C',      // slightly lighter dark gray
  textPrimary: '#FFFFFF',         // white text
  textSecondary: '#8E8E93',      // iOS systemGray
  textTertiary: '#48484A',       // iOS systemGray3
  border: 'rgba(255,255,255,0.10)',
  // Window BY — glass surface tokens (see theme.ts). Lifted to ~#2C so the
  // glass card reads as elevated over the new dark-grey bg.
  glassFill: 'rgba(44,44,48,0.78)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassFillSolid: 'rgba(44,44,48,0.92)',
  // Dark-mode-aware tokens (Phase 3)
  cardBackground: '#242426',
  cardBorder: '#38383A',
  toggleBackground: '#2C2C2E',
  toggleActiveBackground: '#FFFFFF',
  toggleActiveText: '#1C1C1E',
  toggleInactiveText: '#8E8E93',
  gridLine: '#38383A',
  chartLabel: '#8E8E93',
  chartTitle: '#FFFFFF',
  chartValue: '#E5E7EB',
  divider: 'rgba(255,255,255,0.08)',
  inputBackground: '#242426',
  bubbleAI: '#2C2C2E',
  bubbleAIBorder: '#38383A',
  bubbleAIText: '#FFFFFF',
  progressTrack: '#2C2C2E',
  pillBackground: '#FFFFFF',
  pillText: '#1C1C1E',
  // DL v1 §2.11 — toast lifts to the dark elevation ladder (~#2C) so it still
  // reads as a floating layer over the #161618 base.
  toastBackground: 'rgba(44,44,48,0.96)',
  emptyBarColor: '#38383A',
  borderTertiary: '#38383A',
  trail: '#C9A78A',
  attempt: '#FFB95C',
  unreadDot: '#FF453A',
  // BS-P1-η dark variants — markers' rgba fills work on both light and
  // dark Mapbox styles, but text labels must invert for contrast
  // against the dark map background. Halos invert from light → dark.
  outdoorMarkerFill: '#C27C40',
  outdoorMarkerStroke: '#C68455',
  outdoorMarkerText: '#FFFFFF',
  outdoorMarkerFillBoulder: '#9B7E68',
  outdoorMarkerFillMixed: '#B58668',
  routesMarkerFill: '#3E86A8',  // CB点2 — 青蓝(rope-dominant)，dark 下提亮
  gymMarkerFill: '#44847E',
  gymMarkerStroke: '#5BA39C',
  // (no gymMarkerText — see theme.ts)
  markerOpacity: '0.92',  // CB点2 — 同 light，pins 太透明降透明度
  trailReference: '#6B7280',
  // BU crag boundary polygon — slightly lighter pink for dark-mode contrast
  // (light fill at 0.08 opacity on dark Mapbox basemap would be near-invisible
  // with the light-theme hex).
  cragBoundary: '#FF80AB',
  warningTint: 'rgba(249, 115, 22, 0.12)',
  outdoorLabelText: '#F5EBE0',
  outdoorLabelHalo: 'rgba(20, 10, 5, 0.85)',
  gymLabelText: '#E0F5F2',
  gymLabelHalo: 'rgba(5, 20, 18, 0.85)',
};
