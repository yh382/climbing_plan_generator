// src/features/mapscreen/components/GymMarkerIcons.tsx
// CB Phase F — gym map marker. A distinct climbing-gym glyph (user-supplied
// rock_gym_icon: a wall/roof + a climber) on a rounded white tile, so gyms read
// as indoor and stand apart from the colored outdoor dots/rings. Drawn as a
// react-native-svg view + registered via MapboxGL.Images → SymbolLayer
// iconImage (GPU-rasterized).

import Svg, { Path } from 'react-native-svg';

// Original glyph path, viewBox 0 0 1254 1254, fill-rule evenodd (cuts the
// holds/holes). Glyph drawn in near-black on a rounded white tile.
const GYM_GLYPH_D =
  'M 1115.0 593.0 L 919.0 395.0 L 896.0 406.0 L 1074.0 593.0 L 977.0 595.0 ' +
  'L 966.0 607.0 L 965.0 1087.0 L 243.0 1087.0 L 240.0 1112.0 L 988.0 1113.0 ' +
  'L 995.0 625.0 L 1107.0 624.0 Z ' +
  'M 644.0 112.0 L 624.0 115.0 L 142.0 597.0 L 152.0 617.0 L 238.0 618.0 ' +
  'L 244.0 1030.0 L 474.0 787.0 L 489.0 801.0 L 565.0 797.0 L 619.0 871.0 ' +
  'L 539.0 888.0 L 473.0 973.0 L 482.0 998.0 L 505.0 991.0 L 561.0 917.0 ' +
  'L 678.0 899.0 L 706.0 876.0 L 783.0 659.0 L 775.0 610.0 L 733.0 522.0 ' +
  'L 883.0 373.0 L 888.0 354.0 Z ' +
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

/** The rock-gym marker — registered once as image `gym-rock`. No background
 *  tile: a white fill of the glyph outline gives the "inside the building"
 *  white, and the black evenodd glyph on top re-cuts the openings so they show
 *  that white. Everything outside the glyph is transparent. */
export function GymIconRock() {
  return (
    <Svg width={34} height={34} viewBox="0 0 1254 1254">
      {/* white interior (nonzero fill of the whole outline) */}
      <Path d={GYM_GLYPH_D} fill="#FFFFFF" />
      {/* black outline + climber; evenodd keeps the openings showing white */}
      <Path d={GYM_GLYPH_D} fill="#1C1C1E" fillRule="evenodd" />
    </Svg>
  );
}

export const GYM_MARKER_IMAGE = 'gym-rock';
