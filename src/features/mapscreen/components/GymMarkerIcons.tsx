// src/features/mapscreen/components/GymMarkerIcons.tsx
// CB Phase F — gym map marker: a simple teardrop map-pin (gym teal) with a white
// center dot. The teardrop SHAPE marks "rock gym" (vs the outdoor crags' rings),
// explained by the discover legend. Registered via MapboxGL.Images →
// SymbolLayer iconImage (GPU-rasterized); anchored at the tip.

import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../../../lib/theme';

const TEAL = theme.colors.gymMarkerFill; // #44847E

/** The rock-gym marker — registered once as image `gym-rock`. Teardrop pin. */
export function GymIconRock() {
  return (
    <Svg width={30} height={38} viewBox="0 0 32 40">
      {/* teardrop: round top, point at the bottom (tip = the gym location) */}
      <Path
        d="M16 1.5 C 8 1.5 1.5 8 1.5 16 C 1.5 26 16 38.5 16 38.5 C 16 38.5 30.5 26 30.5 16 C 30.5 8 24 1.5 16 1.5 Z"
        fill={TEAL}
        stroke="#FFFFFF"
        strokeWidth={2}
      />
      <Circle cx={16} cy={15.5} r={5.5} fill="#FFFFFF" />
    </Svg>
  );
}

export const GYM_MARKER_IMAGE = 'gym-rock';
