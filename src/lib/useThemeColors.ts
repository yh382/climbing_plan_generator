// src/lib/useThemeColors.ts
import { useColorScheme } from 'react-native';
import { theme } from './theme';
import { darkColors } from './darkTheme';

/**
 * Returns theme colors based on system color scheme.
 * Drop-in replacement for `theme.colors` in components.
 *
 * Usage:
 *   const colors = useThemeColors();
 *   <View style={{ backgroundColor: colors.background }}>
 */
export function useThemeColors() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : theme.colors;
}

/** Non-hook version for use outside React components */
export function getThemeColors(isDark: boolean) {
  return isDark ? darkColors : theme.colors;
}
