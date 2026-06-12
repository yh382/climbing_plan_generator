// src/features/mapscreen/components/GymMarkerIcons.tsx
// CB Phase F — gym map marker (user-supplied house_climbing_icon). Rendered
// FAITHFULLY to the SVG (same 5 paths, same order, evenodd intact — the black
// path's climber subpaths are evenodd holes that show the green through as the
// torso↔house gaps), only recolored: the SVG's bright green (#2db83d) → theme
// green, its black → light brown. No background tile (the gaps are the green
// showing through, not a backdrop). Registered via MapboxGL.Images →
// SymbolLayer iconImage (GPU-rasterized).

import Svg, { Path } from 'react-native-svg';
import { theme } from '../../../lib/theme';

const GREEN = theme.colors.accent; // #306E6F — was #2db83d
const BROWN = '#E8D6AC'; // 米白 / light warm cream (was #D6B786) — was black

// — green paths (limb / torso+holds / house body) —
const G_LIMB =
  'M 477 790 L 553 791 L 566 796 L 630 869 L 647 808 L 581 778 L 574 771 ' +
  'L 545 720 Z';
const G_TORSO =
  'M 722 536 L 584 681 L 616 735 L 668 756 L 682 755 L 732 736 L 746 727 ' +
  'L 769 645 L 765 632 Z ' +
  'M 684 621 L 698 622 L 721 633 L 736 650 L 743 670 L 742 691 L 733 711 ' +
  'L 717 726 L 690 735 L 672 733 L 651 722 L 637 705 L 631 687 L 633 661 ' +
  'L 646 639 L 664 626 Z';
const G_HOUSE =
  'M 1121 584 L 923 377 L 896 353 L 768 487 L 758 501 L 770 511 L 818 619 ' +
  'L 822 632 L 823 654 L 742 927 L 734 939 L 714 956 L 696 962 L 544 971 ' +
  'L 536 977 L 484 1051 L 471 1056 L 459 1055 L 449 1049 L 443 1041 L 440 1032 ' +
  'L 441 1019 L 499 928 L 510 917 L 523 911 L 571 908 L 581 905 L 537 849 ' +
  'L 532 847 L 463 848 L 448 842 L 439 830 L 244 1033 L 243 1121 L 247 1133 ' +
  'L 255 1141 L 264 1145 L 989 1145 L 997 1142 L 1005 1135 L 1009 1126 ' +
  'L 1009 643 L 1013 633 L 1024 626 L 1104 626 L 1112 623 L 1124 608 L 1125 596 Z';

// — black paths (head; roof + climber). The roof/climber path keeps ALL its
//   subpaths in one Path so evenodd cuts the climber out (those holes are the
//   gaps that show green). DON'T split it. —
const B_HEAD =
  'M 677 623 L 659 630 L 641 647 L 632 670 L 632 686 L 640 708 L 654 723 ' +
  'L 677 733 L 696 733 L 715 726 L 731 712 L 741 690 L 741 666 L 732 646 ' +
  'L 718 632 L 697 623 Z';
const B_ROOF_CLIMBER =
  'M 632 99 L 616 105 L 138 583 L 133 592 L 133 609 L 137 616 L 148 624 ' +
  'L 235 625 L 241 628 L 245 635 L 246 1030 L 432 836 L 441 830 L 448 841 ' +
  'L 459 846 L 533 846 L 539 849 L 582 906 L 574 909 L 524 912 L 512 917 ' +
  'L 501 927 L 442 1019 L 443 1039 L 452 1050 L 463 1055 L 478 1053 L 490 1044 ' +
  'L 535 977 L 543 970 L 700 960 L 725 947 L 742 924 L 822 653 L 821 633 ' +
  'L 816 617 L 770 513 L 756 499 L 891 358 L 893 351 L 891 345 L 650 105 Z ' +
  'M 544 719 L 549 723 L 575 771 L 581 777 L 647 806 L 630 871 L 574 804 ' +
  'L 564 796 L 551 792 L 475 791 Z ' +
  'M 722 535 L 767 634 L 770 644 L 769 653 L 747 728 L 730 738 L 672 758 ' +
  'L 614 735 L 582 680 Z';

/** The rock-gym marker — registered once as image `gym-rock`. Faithful SVG,
 *  recolored: green → theme green, black → light brown. No tile. */
export function GymIconRock() {
  return (
    <Svg width={34} height={34} viewBox="0 0 1254 1254">
      <Path d={G_LIMB} fill={GREEN} fillRule="evenodd" />
      <Path d={G_TORSO} fill={GREEN} fillRule="evenodd" />
      <Path d={G_HOUSE} fill={GREEN} fillRule="evenodd" />
      <Path d={B_HEAD} fill={BROWN} fillRule="evenodd" />
      <Path d={B_ROOF_CLIMBER} fill={BROWN} fillRule="evenodd" />
    </Svg>
  );
}

export const GYM_MARKER_IMAGE = 'gym-rock';
