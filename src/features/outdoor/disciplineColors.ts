// src/features/outdoor/disciplineColors.ts
// CD Phase 2 — neutral home for the 4-bucket discipline palette, shared by
// the discover rings (AreaNodeCluster + the legacy CragOverviewCluster), the
// area-mode RoutePinCluster, and the legend. Moved out of RoutePinCluster so
// the new tree-cluster source doesn't import a module that's being deprecated
// on the map main path.

import { theme } from '../../lib/theme';

/** CB Phase F — 4-bucket style palette, shared with the discover cluster
 *  rings + legend so dots, rings, and the legend all read the same.
 *  Boulder/sport reuse the pin colors; trad green + other grey are
 *  device-tunable. */
export const STYLE_COLORS = {
  boulder: theme.colors.outdoorMarkerFill, // sandstone
  sport: theme.colors.routesMarkerFill, // teal-blue
  trad: '#5E8C61', // muted green
  other: '#9AA0A6', // grey
} as const;
