// src/components/shared/placeSheet/PlaceSheetFooter.tsx
// Apple Maps-style sheet footer — a horizontal cluster of liquid-glass
// SF Symbol buttons fused into one continuous capsule via
// `glassEffectUnion`. Mirrors the `+, ⭐, ⋯` pill at the bottom of the
// Apple Maps POI sheet.
//
// Render through TrueSheet's `footer` prop so iOS pins the whole
// view (gradient mist + buttons) outside the scrollable area in
// every detent.
//
// Visual stack (back to front), rendered inside this component
// because TrueSheet's footer slot is the only reliably-pinned region
// at the sheet's bottom — sibling-positioned overlays inside the
// content slot don't render reliably across `scrollable` setups:
//
//   1. LinearGradient mist — extends ABOVE the dock via negative top
//      and continues over the dock area, fading scroll content into a
//      lighter "veil" that highlights the toolbar zone WITHOUT
//      obscuring content (BlurView gave a too-opaque material that
//      blanked out everything behind it).
//   2. Glass-union buttons — sit on top of the mist.

import { StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Host,
  Button,
  HStack,
  GlassEffectContainer,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  labelStyle,
  frame,
  font,
  glassEffect,
} from '@expo/ui/swift-ui/modifiers';
import {
  GlassUnionGroup,
  glassEffectUnion,
} from '../../../../modules/glass-effect-union/src';

export type PlaceSheetFooterAction = {
  /** SF Symbol name (e.g. "info.circle", "heart", "square.and.arrow.up"). */
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  /** Stable key for React reconciliation. Defaults to icon name. */
  key?: string;
};

interface Props {
  /** 1..N glass icon buttons. They auto-fuse into one capsule via union. */
  actions: PlaceSheetFooterAction[];
  /** Namespace for `glassEffectUnion`. Different sheets MUST use distinct
   *  ids so independent footers don't bleed into each other's union. */
  unionId: string;
}

const BTN_SIZE = 48;
const TOP_PADDING = 8;
const MIN_BOTTOM_PADDING = 12;
const FADE_BAND = 64;

/** Total dock height as a function of bottom safe area inset. Exported
 *  for any caller that needs to size sibling overlays to the same area. */
export function placeSheetFooterDockHeight(insetBottom: number): number {
  return TOP_PADDING + BTN_SIZE + Math.max(insetBottom, MIN_BOTTOM_PADDING);
}

const GLASS_CAPSULE = glassEffect({
  glass: { variant: 'regular', interactive: true },
  shape: 'capsule',
});

export function PlaceSheetFooter({ actions, unionId }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const visible = actions.filter((a) => a.disabled !== true);

  if (visible.length === 0) return null;

  const dockHeight = placeSheetFooterDockHeight(insets.bottom);
  const fadeBase = scheme === 'dark' ? '28, 28, 30' : '255, 255, 255';

  // SwiftUI Button modifiers — every button shares the same union id so
  // the row renders as one continuous liquid-glass capsule (Apple Maps
  // toolbar feel).
  const btnModifiers = [
    buttonStyle('plain'),
    labelStyle('iconOnly'),
    font({ size: 19, weight: 'regular' }),
    frame({ width: BTN_SIZE, height: BTN_SIZE, alignment: 'center' }),
    GLASS_CAPSULE,
    glassEffectUnion(unionId),
  ];

  return (
    <View style={[styles.dock, { height: dockHeight }]} pointerEvents="box-none">
      {/* Mist gradient — starts ABOVE the dock (negative top escapes
          the dock's nominal box; RN iOS doesn't clip overflow) and
          continues all the way to the bottom of the dock. Alpha
          peaks at ~0.65 so the dock zone is visibly lighter than the
          surrounding sheet glass while content behind stays
          discernible. Pure white-on-white at high alpha is invisible
          (sheet glass is already white-tinted); a fully opaque blur
          obscures everything (BlurView). 0.65 is the sweet spot. */}
      <LinearGradient
        colors={
          [
            `rgba(${fadeBase}, 0)`,
            `rgba(${fadeBase}, 0.35)`,
            `rgba(${fadeBase}, 0.65)`,
          ] as unknown as [string, string, ...string[]]
        }
        locations={[0, 0.55, 1]}
        style={styles.fade}
        pointerEvents="none"
      />

      {/* Buttons centered horizontally on top of the mist. */}
      <View
        style={[styles.btnSlot, { paddingTop: TOP_PADDING }]}
        pointerEvents="box-none"
      >
        <Host matchContents>
          <GlassEffectContainer spacing={20}>
            <GlassUnionGroup>
              <HStack spacing={0}>
                {visible.map((a, i) => (
                  <Button
                    key={a.key ?? `${a.icon}-${i}`}
                    systemImage={a.icon as any}
                    label=""
                    onPress={a.onPress}
                    modifiers={btnModifiers as any}
                  />
                ))}
              </HStack>
            </GlassUnionGroup>
          </GlassEffectContainer>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    // Height set inline so RN measures the dock with a stable,
    // synchronous value before SwiftUI's async measurement lands.
    // overflow: visible is the iOS RN default — required so the
    // fade gradient at `top: -FADE_BAND` renders outside this box.
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Spans from above the dock all the way to the bottom — the
    // mist covers the whole toolbar zone, not just the band above it.
    top: -FADE_BAND,
    bottom: 0,
  },
  btnSlot: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});
