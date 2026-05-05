// src/lib/nativeHeaderOptions.ts
// Shared native iOS header configuration for Expo Router Stack screens
// Uses system default translucent nav bar — iOS 26 Liquid Glass applies automatically

import { Platform } from 'react-native';
import { theme } from './theme';
import type { useThemeColors } from './useThemeColors';

/** True on iOS 26+ (Liquid Glass nav bar makes transparent + scrollEdgeEffects
 *  beautiful), false on iOS<26 / Android — there transparent header leaves
 *  buttons floating on raw scroll content with no backdrop, so icons get
 *  unreadable when content scrolls past. Falling back to opaque chrome on
 *  those targets is the COMPAT-friendly default.
 *
 *  Use as: `headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' }`. */
export const HEADER_TRANSPARENT =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

/** Base header (system default translucent bar with back+title) */
export const NATIVE_HEADER_BASE = {} as const;

/** Large title header (for tab/landing screens — collapses on scroll like Apple Fitness) */
export const NATIVE_HEADER_LARGE = {
  ...NATIVE_HEADER_BASE,
  headerLargeTitle: true,
  headerLargeTitleShadowVisible: false,
} as const;

/** Theme-aware header text colors + brand DM Sans font. iOS renders the
 *  large title and its collapsed inline title from these styles, so setting
 *  fontFamily here applies app-wide (Home / Activity / Daily Summary / any
 *  Stack screen using withHeaderTheme). */
export function withHeaderTheme(colors: ReturnType<typeof useThemeColors>) {
  return {
    headerTintColor: colors.textPrimary,
    headerTitleStyle: {
      color: colors.textPrimary,
      fontFamily: theme.fonts.bold,
    },
    headerLargeTitleStyle: {
      color: colors.textPrimary,
      fontFamily: theme.fonts.black,
    },
  };
}
