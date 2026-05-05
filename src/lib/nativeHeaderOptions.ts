// src/lib/nativeHeaderOptions.ts
// Shared native iOS header configuration for Expo Router Stack screens
// Uses system default translucent nav bar — iOS 26 Liquid Glass applies automatically

import { Platform } from 'react-native';
import { theme } from './theme';
import type { useThemeColors } from './useThemeColors';

/** `true` on iOS 26+ (Liquid Glass floating-header look — content scrolls
 *  through transparent chrome), `undefined` elsewhere so iOS 17/18 falls
 *  back to the native translucent NavigationBar default (auto blur material
 *  + scrollEdgeAppearance: transparent at top, opaque after scrolling past
 *  large title). Setting `false` explicitly on iOS<26 forces the standard
 *  appearance everywhere and traps the large title inside a tall opaque
 *  chrome — looks worse than the system default.
 *
 *  Use as: `headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' }`.
 *  When undefined, the prop is silently ignored — exactly what we want. */
export const HEADER_TRANSPARENT: true | undefined =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26
    ? true
    : undefined;

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
 *  Stack screen using withHeaderTheme).
 *
 *  iOS<26: also sets `headerLargeStyle.backgroundColor` and
 *  `headerStyle.backgroundColor` to `colors.background` so the
 *  scrollEdgeAppearance (transparent by default for large titles) gets a
 *  solid backdrop matching the screen — without this, scrolled content
 *  bleeds up through the transparent chrome into the status bar zone. iOS
 *  26 keeps these undefined to preserve the floating Liquid Glass look. */
export function withHeaderTheme(colors: ReturnType<typeof useThemeColors>) {
  const isIOS = Platform.OS === 'ios';
  const iosVersion = isIOS ? parseInt(String(Platform.Version), 10) : 0;
  const needsOpaqueBackdrop = isIOS && iosVersion < 26;

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
    ...(needsOpaqueBackdrop
      ? {
          headerStyle: { backgroundColor: colors.background },
          headerLargeStyle: { backgroundColor: colors.background },
        }
      : null),
  };
}
