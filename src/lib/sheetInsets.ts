import { Platform } from "react-native";

// Floating-pill tab bar (iOS 26+) sits ~14pt above the standard 49pt bar
// height. iOS <26 uses a standard opaque tab bar pinned to bottom (forced
// by `disableTransparentOnScrollEdge` in tabs _layout). Sheet content needs
// this much padding at the bottom so the last item is not hidden under the
// tab bar pill (note: TrueSheet itself still anchors to screen bottom edge —
// the tab bar visually overlaps the sheet's bottom area; padding ensures
// the last interactive list item clears the pill footprint).
const TAB_BAR_BASE_HEIGHT = 49;

export function getMapSheetBottomInset(safeAreaInsets: { bottom: number }): number {
  const isIOS26Plus = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;
  const floatingPillExtraOffset = isIOS26Plus ? 14 : 0; // TODO: 14pt 经验初值，真机实测后微调
  return TAB_BAR_BASE_HEIGHT + floatingPillExtraOffset + safeAreaInsets.bottom;
}
