// src/lib/nativeHeaderOptions.ts
// Shared native iOS header configuration for Expo Router Stack screens
// Uses system default translucent nav bar — iOS 26 Liquid Glass applies automatically

import type { useThemeColors } from './useThemeColors';

/** Base header (system default translucent bar with back+title) */
export const NATIVE_HEADER_BASE = {} as const;

/** Large title header (for tab/landing screens — collapses on scroll like Apple Fitness) */
export const NATIVE_HEADER_LARGE = {
  ...NATIVE_HEADER_BASE,
  headerLargeTitle: true,
  headerLargeTitleShadowVisible: false,
} as const;

/** Theme-aware header text colors — no background override, preserves native translucent bar */
export function withHeaderTheme(colors: ReturnType<typeof useThemeColors>) {
  return {
    headerTintColor: colors.textPrimary,
    headerTitleStyle: { color: colors.textPrimary },
    headerLargeTitleStyle: { color: colors.textPrimary },
  };
}
