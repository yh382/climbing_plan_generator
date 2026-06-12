// src/features/mapscreen/components/GymMarkerIcons.tsx
// CB Phase F — gym distinct-marker PREVIEW variants. Now that outdoor pins are
// colored dots + composition rings, gyms (a teal dot) blend in. These three
// designs give gyms a distinct SHAPE/glyph so indoor ≠ outdoor at a glance.
// Round-robin'd across gyms (by index) so all three are visible in one screen
// to compare; once a winner is picked we drop to that one only.
//
// All teal (gymMarkerFill) with white detail, drawn as react-native-svg views
// registered via MapboxGL.Images → SymbolLayer iconImage (GPU-rasterized).

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { theme } from '../../../lib/theme';

const TEAL = theme.colors.gymMarkerFill; // #44847E
const STROKE = '#FFFFFF';

/** V0 — rounded-square "chip" with a 2×2 white holds grid (a climbing wall).
 *  Square shape reads clearly different from the round outdoor pins. */
export function GymIconChip() {
  return (
    <Svg width={30} height={30}>
      <Rect x={4} y={4} width={22} height={22} rx={6} fill={TEAL} stroke={STROKE} strokeWidth={2} />
      <Rect x={10} y={10} width={4} height={4} rx={1} fill={STROKE} />
      <Rect x={16} y={10} width={4} height={4} rx={1} fill={STROKE} />
      <Rect x={10} y={16} width={4} height={4} rx={1} fill={STROKE} />
      <Rect x={16} y={16} width={4} height={4} rx={1} fill={STROKE} />
    </Svg>
  );
}

/** V1 — teardrop map-pin with a white center dot. Classic "place" marker;
 *  the pin silhouette + drop point separate it from flat outdoor dots. */
export function GymIconPin() {
  return (
    <Svg width={30} height={36}>
      <Path
        d="M15 3 C 8 3 3 8 3 15 C 3 23 15 33 15 33 C 15 33 27 23 27 15 C 27 8 22 3 15 3 Z"
        fill={TEAL}
        stroke={STROKE}
        strokeWidth={2}
      />
      <Circle cx={15} cy={14} r={4.5} fill={STROKE} />
    </Svg>
  );
}

/** V2 — teal circle with three white "holds". Same circular footprint as the
 *  outdoor dots but a glyph inside flags it as a gym. */
export function GymIconHolds() {
  return (
    <Svg width={30} height={30}>
      <Circle cx={15} cy={15} r={12} fill={TEAL} stroke={STROKE} strokeWidth={2} />
      <Circle cx={12} cy={11} r={2} fill={STROKE} />
      <Circle cx={19.5} cy={14} r={2} fill={STROKE} />
      <Circle cx={13} cy={19.5} r={2} fill={STROKE} />
    </Svg>
  );
}

/** Registration list — name ↔ component ↔ display anchor. The `anchor` differs
 *  because the teardrop points DOWN (anchor at its tip), the others are
 *  centered. */
export const GYM_MARKER_VARIANTS = [
  { name: 'gym-v0-chip', Comp: GymIconChip, anchor: 'center' as const },
  { name: 'gym-v1-pin', Comp: GymIconPin, anchor: 'bottom' as const },
  { name: 'gym-v2-holds', Comp: GymIconHolds, anchor: 'center' as const },
];
export const GYM_VARIANT_COUNT = GYM_MARKER_VARIANTS.length;
