// src/components/shared/placeSheet/PlaceSheetFooter.tsx
// Apple Maps-style sheet footer — a horizontal cluster of liquid-glass
// SF Symbol buttons fused into one continuous capsule via the
// self-contained `GlassUnionPill` native view (single SwiftUI subtree
// owning the @Namespace; robust against RN sibling re-renders).
//
// Render through TrueSheet's `footer` prop so iOS pins the whole view
// (gradient mist + buttons) outside the scrollable area in every detent.

import { StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GlassUnionPill,
  type GlassUnionPillItem,
} from '../../../../modules/glass-effect-union/src';

export type PlaceSheetFooterAction = {
  /** SF Symbol name (e.g. "info.circle", "heart", "square.and.arrow.up"). */
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  /** Stable key for native event routing. Defaults to icon name. */
  key?: string;
};

interface Props {
  /** 1..N glass icon buttons. They auto-fuse into one capsule via union. */
  actions: PlaceSheetFooterAction[];
  /** Namespace for the union — distinct sheets MUST use distinct ids so
   *  independent footers don't bleed into each other's union. */
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

export function PlaceSheetFooter({ actions, unionId }: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const visible = actions.filter((a) => a.disabled !== true);

  if (visible.length === 0) return null;

  const dockHeight = placeSheetFooterDockHeight(insets.bottom);
  const fadeBase = scheme === 'dark' ? '28, 28, 30' : '255, 255, 255';

  const pillItems: GlassUnionPillItem[] = visible.map((a, i) => ({
    key: a.key ?? `${a.icon}-${i}`,
    kind: 'icon',
    icon: a.icon,
    fontSize: 19,
    fontWeight: 'regular',
    onPress: a.onPress,
  }));

  const pillWidth = visible.length * BTN_SIZE;

  return (
    <View style={[styles.dock, { height: dockHeight }]} pointerEvents="box-none">
      {/* Mist gradient — starts ABOVE the dock (negative top escapes
          the dock's nominal box; RN iOS doesn't clip overflow) and
          continues all the way to the bottom of the dock. Alpha
          peaks at ~0.65 so the dock zone is visibly lighter than the
          surrounding sheet glass while content behind stays
          discernible. */}
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

      {/* Buttons centered horizontally, anchored to the BOTTOM of the
          dock with the safe-area inset as paddingBottom so the glass
          capsule sits flush with the screen's bottom edge. */}
      <View
        style={[
          styles.btnSlot,
          {
            paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PADDING),
          },
        ]}
        pointerEvents="box-none"
      >
        <GlassUnionPill
          axis="horizontal"
          unionId={unionId}
          buttonSize={BTN_SIZE}
          items={pillItems}
          style={{ width: pillWidth, height: BTN_SIZE }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    // overflow: visible is the iOS RN default — required so the
    // fade gradient at `top: -FADE_BAND` renders outside this box.
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -FADE_BAND,
    bottom: 0,
  },
  btnSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
