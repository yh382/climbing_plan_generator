// src/lib/darkTheme.ts
// Dark mode color overrides — matches theme.colors structure

import type { ThemeColors } from './theme';

export const darkColors: ThemeColors = {
  accent: '#306E6F',              // unchanged — brand color
  background: '#000000',          // pure black (OLED friendly)
  sheetBackground: '#1C1C1E',    // iOS elevated surface for sheets
  sheetCardBackground: '#2C2C2E', // card/input backgrounds inside sheets
  backgroundSecondary: '#1C1C1E', // iOS systemGroupedBackground dark
  cardDark: '#2C2C2E',           // iOS secondarySystemGroupedBackground dark
  cardDarkImage: '#3A3A3C',      // slightly lighter dark gray
  textPrimary: '#FFFFFF',         // white text
  textSecondary: '#8E8E93',      // iOS systemGray
  textTertiary: '#48484A',       // iOS systemGray3
  border: 'rgba(255,255,255,0.10)',
  // Dark-mode-aware tokens (Phase 3)
  cardBackground: '#1C1C1E',
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
  inputBackground: '#1C1C1E',
  bubbleAI: '#2C2C2E',
  bubbleAIBorder: '#38383A',
  bubbleAIText: '#FFFFFF',
  progressTrack: '#2C2C2E',
  pillBackground: '#FFFFFF',
  pillText: '#1C1C1E',
  emptyBarColor: '#38383A',
  borderTertiary: '#38383A',
};
