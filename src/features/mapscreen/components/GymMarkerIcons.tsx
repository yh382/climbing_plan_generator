// src/features/mapscreen/components/GymMarkerIcons.tsx
// CB Phase F — gym map marker. A distinct climbing-gym glyph (user-supplied
// rock_gym_icon: a wall/roof + a climber) so gyms read as indoor and stand
// apart from the colored outdoor dots/rings. Drawn as a react-native-svg view +
// registered via MapboxGL.Images → SymbolLayer iconImage (GPU-rasterized).
//
// No background tile. The original path's 5 subpaths are split so the BUILDING
// outline (roof/floor + wall face) can be filled cream on its own as the
// interior — filling the whole path nonzero left the area around the climber
// transparent (the climber subpaths subtract from the winding). The full black
// evenodd glyph is then painted on top.

import Svg, { Path } from 'react-native-svg';

const CREAM = '#F3EEE3'; // 米白 interior
const INK = '#1C1C1E'; // near-black outline/climber

// — building outline (roof line + floor + right wall) —
const P_ROOF_FLOOR =
  'M 1115.0 593.0 L 919.0 395.0 L 896.0 406.0 L 1074.0 593.0 L 977.0 595.0 ' +
  'L 966.0 607.0 L 965.0 1087.0 L 243.0 1087.0 L 240.0 1112.0 L 988.0 1113.0 ' +
  'L 995.0 625.0 L 1107.0 624.0 Z';
// — main wall face (where the climber is) —
const P_WALL =
  'M 644.0 112.0 L 624.0 115.0 L 142.0 597.0 L 152.0 617.0 L 238.0 618.0 ' +
  'L 244.0 1030.0 L 474.0 787.0 L 489.0 801.0 L 565.0 797.0 L 619.0 871.0 ' +
  'L 539.0 888.0 L 473.0 973.0 L 482.0 998.0 L 505.0 991.0 L 561.0 917.0 ' +
  'L 678.0 899.0 L 706.0 876.0 L 783.0 659.0 L 775.0 610.0 L 733.0 522.0 ' +
  'L 883.0 373.0 L 888.0 354.0 Z';
// — climber subpaths (holds/figure), only drawn in the black glyph —
const P_CLIMBER =
  'M 570.0 687.0 L 591.0 730.0 L 602.0 744.0 L 625.0 762.0 L 652.0 772.0 ' +
  'L 632.0 829.0 L 591.0 773.0 L 580.0 764.0 L 559.0 763.0 L 509.0 766.0 ' +
  'L 494.0 765.0 Z ' +
  'M 713.0 543.0 L 735.0 593.0 L 750.0 634.0 L 751.0 657.0 L 745.0 678.0 ' +
  'L 729.0 718.0 L 720.0 726.0 L 704.0 733.0 L 676.0 740.0 L 660.0 740.0 ' +
  'L 648.0 737.0 L 635.0 730.0 L 621.0 716.0 L 600.0 672.0 L 590.0 666.0 Z ' +
  'M 683.0 636.0 L 682.0 637.0 L 674.0 638.0 L 664.0 643.0 L 654.0 653.0 ' +
  'L 648.0 665.0 L 646.0 678.0 L 647.0 679.0 L 647.0 686.0 L 652.0 698.0 ' +
  'L 663.0 710.0 L 672.0 715.0 L 678.0 717.0 L 690.0 718.0 L 691.0 717.0 ' +
  'L 696.0 717.0 L 708.0 712.0 L 720.0 701.0 L 727.0 686.0 L 728.0 674.0 ' +
  'L 727.0 673.0 L 727.0 668.0 L 722.0 656.0 L 711.0 644.0 L 700.0 638.0 ' +
  'L 692.0 637.0 L 691.0 636.0 Z';

const GYM_GLYPH_D = `${P_ROOF_FLOOR} ${P_WALL} ${P_CLIMBER}`;

/** The rock-gym marker — registered once as image `gym-rock`. Cream-filled
 *  building interior (no tile), black outline + climber on top.
 *
 *  The glyph subpaths are thin self-intersecting outlines, so filling any one
 *  leaves gaps. To get a solid cream interior WITHOUT spilling outside the
 *  building, fill the whole path nonzero AND every subpath solid — their union
 *  is exactly the building footprint — then paint the black evenodd glyph over
 *  it. */
export function GymIconRock() {
  return (
    <Svg width={34} height={34} viewBox="0 0 1254 1254">
      <Path d={GYM_GLYPH_D} fill={CREAM} />
      <Path d={P_ROOF_FLOOR} fill={CREAM} />
      <Path d={P_WALL} fill={CREAM} />
      <Path d={P_CLIMBER} fill={CREAM} />
      {/* black outline + climber; evenodd cuts the openings back to cream */}
      <Path d={GYM_GLYPH_D} fill={INK} fillRule="evenodd" />
    </Svg>
  );
}

export const GYM_MARKER_IMAGE = 'gym-rock';
