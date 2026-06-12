// src/features/mapscreen/components/GymMarkerIcons.tsx
// CB Phase F — gym map marker. A distinct climbing-gym glyph (user-supplied
// rock_gym_icon_final: a wall/roof + a climber) so gyms read as indoor and
// stand apart from the colored outdoor dots/rings. Drawn as a react-native-svg
// view + registered via MapboxGL.Images → SymbolLayer iconImage (GPU-raster).
//
// No background tile. The building OUTER outline is filled solid cream as the
// interior; the black evenodd glyph (head + roof/floor + wall/climber) paints
// on top. nonzero fill = "inside only" so the cream never spills outside.

import Svg, { Path } from 'react-native-svg';

const CREAM = '#F3EEE3'; // 米白 interior
const INK = '#1C1C1E'; // near-black outline/climber

// head / top hold (small circle)
const P_HEAD =
  'M 688 563 L 668 568 L 656 574 L 637 591 L 629 603 L 623 618 L 621 628 ' +
  'L 621 650 L 625 665 L 632 679 L 650 699 L 665 708 L 680 713 L 706 714 ' +
  'L 729 707 L 744 697 L 755 686 L 764 672 L 769 659 L 771 649 L 771 628 ' +
  'L 768 615 L 761 600 L 745 581 L 730 571 L 718 566 L 703 563 Z';

// right roof beam + floor + right wall
const P_ROOF_FLOOR =
  'M 1193 582 L 955 340 L 951 338 L 941 338 L 918 357 L 915 363 L 915 371 ' +
  'L 917 376 L 1127 587 L 1021 588 L 1010 592 L 1002 600 L 998 611 L 997 1146 ' +
  'L 178 1146 L 172 1149 L 167 1157 L 168 1189 L 172 1194 L 178 1197 L 1036 1197 ' +
  'L 1042 1194 L 1047 1189 L 1050 1182 L 1051 638 L 1174 638 L 1181 636 ' +
  'L 1190 629 L 1196 616 L 1196 590 Z';

// main wall/building outer outline (the climber's surroundings)
const P_WALL_OUTER =
  'M 657 67 L 643 67 L 634 72 L 371 313 L 80 576 L 59 597 L 57 602 L 58 617 ' +
  'L 64 626 L 73 631 L 164 632 L 167 635 L 167 1057 L 169 1062 L 176 1067 ' +
  'L 182 1067 L 189 1062 L 403 766 L 491 680 L 497 690 L 530 765 L 542 778 ' +
  'L 554 784 L 652 810 L 656 813 L 656 817 L 637 889 L 558 809 L 544 801 ' +
  'L 535 799 L 438 799 L 424 804 L 415 812 L 408 826 L 407 839 L 411 852 ' +
  'L 419 862 L 431 869 L 441 871 L 517 871 L 584 939 L 576 941 L 507 943 ' +
  'L 490 949 L 478 958 L 398 1057 L 394 1069 L 394 1081 L 401 1097 L 411 1106 ' +
  'L 423 1111 L 438 1111 L 449 1107 L 458 1100 L 518 1028 L 526 1021 L 694 1018 ' +
  'L 718 1016 L 728 1013 L 748 1001 L 761 987 L 769 972 L 836 757 L 886 618 ' +
  'L 886 599 L 882 585 L 802 415 L 787 401 L 886 310 L 891 298 L 892 289 ' +
  'L 889 276 L 882 266 L 666 72 Z';
// climber body cutout (a hole in the wall path)
const P_WALL_HOLE =
  'M 738 447 L 751 469 L 813 601 L 813 611 L 777 702 L 768 709 L 680 740 ' +
  'L 668 740 L 589 720 L 583 714 L 552 644 L 542 630 Z';
const P_WALL = `${P_WALL_OUTER} ${P_WALL_HOLE}`;

/** The rock-gym marker — registered once as image `gym-rock`. Cream building
 *  interior (no tile), black glyph on top. */
export function GymIconRock() {
  return (
    <Svg width={34} height={34} viewBox="0 0 1254 1254">
      {/* cream interior — solid fills of the building outlines (inside only) */}
      <Path d={P_WALL_OUTER} fill={CREAM} />
      <Path d={P_ROOF_FLOOR} fill={CREAM} />
      <Path d={P_HEAD} fill={CREAM} />
      {/* black glyph, faithful evenodd, on top */}
      <Path d={P_HEAD} fill={INK} fillRule="evenodd" />
      <Path d={P_ROOF_FLOOR} fill={INK} fillRule="evenodd" />
      <Path d={P_WALL} fill={INK} fillRule="evenodd" />
    </Svg>
  );
}

export const GYM_MARKER_IMAGE = 'gym-rock';
