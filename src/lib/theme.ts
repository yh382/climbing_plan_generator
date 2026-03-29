export const theme = {
  colors: {
    accent: '#306E6F',
    background: '#FFFFFF',
    sheetBackground: '#FFFFFF',
    sheetCardBackground: '#F7F7F7',
    backgroundSecondary: '#F7F7F7',
    cardDark: '#1C1C1E',
    cardDarkImage: '#272727',
    textPrimary: '#000000',
    textSecondary: '#888888',
    textTertiary: '#BBBBBB',
    border: 'rgba(0,0,0,0.08)',
    // Dark-mode-aware tokens (Phase 3)
    cardBackground: '#F7F7F7',
    cardBorder: '#E5E7EB',
    toggleBackground: '#FFFFFF',
    toggleActiveBackground: '#1C1C1E',
    toggleActiveText: '#FFFFFF',
    toggleInactiveText: '#888888',
    gridLine: '#E5E7EB',
    chartLabel: '#64748B',
    chartTitle: '#000000',
    chartValue: '#374151',
    divider: 'rgba(0,0,0,0.08)',
    inputBackground: '#F7F7F7',
    bubbleAI: '#FFFFFF',
    bubbleAIBorder: '#E5E7EB',
    bubbleAIText: '#111827',
    progressTrack: '#F3F4F6',
    pillBackground: '#1C1C1E',
    pillText: '#FFFFFF',
    emptyBarColor: '#E5E7EB',
    borderTertiary: '#E5E7EB',
  },
  typography: {
    hero: { fontSize: 33, fontWeight: '900' as const, letterSpacing: -1.5 },
    sectionTitle: { fontSize: 18, fontWeight: '900' as const, letterSpacing: -0.5 },
    cardTitle: { fontSize: 13, fontWeight: '700' as const },
    body: { fontSize: 14, fontWeight: '400' as const },
    caption: { fontSize: 11, fontWeight: '400' as const },
    label: { fontSize: 10, fontWeight: '600' as const, letterSpacing: 0.3 },
  },
  fonts: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    bold: 'DMSans_700Bold',
    black: 'DMSans_900Black',
    monoRegular: 'DMMono_400Regular',
    monoMedium: 'DMMono_500Medium',
  },
  spacing: {
    screenPadding: 22,
    sectionGap: 20,
    cardGap: 8,
    cardPadding: 12,
  },
  borderRadius: {
    card: 14,
    cardSmall: 12,
    pill: 999,
  },
} as const

/** Grade 颜色系统 — 绿→accent→棕 渐变 (v2 spec §13) */
export const BOULDER_GRADE_COLORS: Record<string, string> = {
  'VB':  '#C8D4C8',
  'V0':  '#B8C8B8',
  'V1':  '#A8BEA8',
  'V2':  '#8FB09A',
  'V3':  '#78A28C',
  'V4':  '#5D9080',
  'V5':  '#3D7E74',
  'V6':  '#306E6F',  // accent 顶点
  'V7':  '#2A5E62',
  'V8':  '#5A5050',
  'V9':  '#7A5E52',
  'V10': '#8B6F5C',
  'V11': '#7A5848',
  'V12': '#6A4838',
  'V13': '#5C3D2E',
  'V14': '#4A2E22',
  'V15': '#3A2018',
} as const

export const ROPE_GRADE_COLORS: Record<string, string> = {
  '5.6':   '#C8D4C8',
  '5.7':   '#B8C8B8',
  '5.8':   '#A8BEA8',
  '5.9':   '#8FB09A',
  '5.10a': '#78A28C',
  '5.10b': '#64947E',
  '5.10c': '#4E8470',
  '5.10d': '#3D7870',
  '5.11a': '#306E6F',  // accent 顶点
  '5.11b': '#2A5E62',
  '5.11c': '#2A5058',
  '5.11d': '#3E4C52',
  '5.12a': '#5A5050',
  '5.12b': '#7A5E52',
  '5.12c': '#8B6F5C',
  '5.12d': '#7A5848',
  '5.13a': '#6A4838',
  '5.13b': '#5C3D2E',
  '5.13c': '#4A2E22',
  '5.13d': '#3A2018',
  '5.14a': '#2E1810',
  '5.14b': '#251208',
  '5.14c': '#1E0E06',
  '5.14d': '#180A04',
  '5.15':  '#100602',
} as const

/** CSM 训练状态颜色 (v2 spec §14) */
export const CSM_STATE_COLORS = {
  push:      '#306E6F',  // accent — 稳定+推进高
  challenge: '#8B6F5C',  // 暖棕 — 不稳定+推进高
  develop:   '#B8C8B8',  // 冷现绿 — 稳定+推进低
  rebuild:   '#A08060',  // 中暖棕 — 不稳定+推进低
} as const

/** CSM 四象限填充色 (与状态颜色对应, 低透明度) */
export const CSM_QUADRANT_COLORS = {
  push:      'rgba(48, 110, 111, 0.20)',
  challenge: 'rgba(139, 111, 92, 0.20)',
  develop:   'rgba(184, 200, 184, 0.35)',
  rebuild:   'rgba(160, 128, 96, 0.20)',
} as const

/** Color object type for light/dark mode switching (widened to string for dark overrides) */
export type ThemeColors = { [K in keyof typeof theme.colors]: string };
