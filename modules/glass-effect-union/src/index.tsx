// Self-contained liquid-glass pill native view.
//
// Replaces the prior `<GlassUnionGroup>` + `glassEffectUnion(id)` modifier
// API, which routed children through `@expo/ui`'s modifier registry and
// relied on SwiftUI Environment propagation across the JS↔SwiftUI bridge
// to bind buttons into a shared `@Namespace`. That injection was silently
// broken by RN sibling re-renders on the same screen (the "candied haw"
// bug; see pattern_glasseffectunion_rn_swiftui_conflict in user memory).
//
// The new view owns its `@Namespace` and renders every member Button
// inside the same SwiftUI subtree. RN can re-render freely outside — the
// fusion stays stable.

import { requireNativeView } from "expo";
import { useCallback, useMemo, useRef, type ComponentType } from "react";
import type { ViewStyle } from "react-native";

export type PillItemKind = "icon" | "count";

export type FontWeight =
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold";

/** One member of the fused pill. Pass `onPress` from the call site; the
 *  wrapper routes the native event back to the matching `key`. */
export type GlassUnionPillItem = {
  /** Stable id; the native event carries this back. */
  key: string;
  kind?: PillItemKind;
  /** SF Symbol name. Required when `kind === "icon"`. */
  icon?: string;
  /** Text label. Required when `kind === "count"` (e.g. "7" or "99+"). */
  label?: string;
  /** Hex tint applied to the regular-glass material (count-badge style). */
  tint?: string;
  /** Hex foreground (label/icon color). Defaults to platform primary. */
  foregroundColor?: string;
  /** Point size. Defaults to 19. */
  fontSize?: number;
  /** Defaults to "light" (light SF Symbol weight). */
  fontWeight?: FontWeight;
  /** Use monospaced digit + numeric content transition (odometer effect).
   *  Only meaningful for `kind === "count"`. */
  numericTransition?: boolean;
  /** Hidden when false; the pill auto-shrinks via SwiftUI's glass-union
   *  morph animation. Defaults to true. */
  visible?: boolean;
  /** Per-item tap handler. Stripped before crossing the bridge. */
  onPress?: () => void;
};

type NativeItem = Omit<GlassUnionPillItem, "onPress">;

type NativeProps = {
  axis: "horizontal" | "vertical";
  unionId: string;
  containerSpacing?: number;
  buttonSize?: number;
  items: NativeItem[];
  onItemPress?: (event: { nativeEvent: { key: string } }) => void;
  style?: ViewStyle;
};

const NativePill: ComponentType<NativeProps> = requireNativeView(
  "GlassEffectUnion",
  "GlassUnionPillView",
);

export interface GlassUnionPillProps {
  /** "horizontal" → HStack pill, "vertical" → VStack pill. */
  axis: "horizontal" | "vertical";
  /** Independent pill instances on the same screen MUST use distinct ids
   *  so SwiftUI doesn't try to fuse across them. */
  unionId: string;
  /** GlassEffectContainer spacing. Defaults to 20 (Apple Maps feel). */
  containerSpacing?: number;
  /** Square button edge length. Defaults to 44. */
  buttonSize?: number;
  /** Pill members, in render order. Hidden items (visible:false) animate
   *  out via SwiftUI's glass-union morph. */
  items: GlassUnionPillItem[];
  style?: ViewStyle;
}

/**
 * Liquid-glass pill that fuses 1..N member buttons via iOS 26's
 * `glassEffectUnion`. All members live inside a single SwiftUI subtree
 * with a shared `@Namespace` — robust against RN sibling re-renders.
 */
export function GlassUnionPill({
  axis,
  unionId,
  containerSpacing,
  buttonSize,
  items,
  style,
}: GlassUnionPillProps) {
  const nativeItems = useMemo<NativeItem[]>(
    () => items.map(({ onPress: _onPress, ...rest }) => rest),
    [items],
  );

  // Keep a ref to the latest per-key callbacks so the native event handler
  // doesn't need to be re-bound (and the native view's props don't churn)
  // when caller closures change identity each render.
  const callbacksRef = useRef<Record<string, (() => void) | undefined>>({});
  callbacksRef.current = Object.fromEntries(
    items.map((i) => [i.key, i.onPress]),
  );

  const handleNativeEvent = useCallback(
    (e: { nativeEvent: { key: string } }) => {
      callbacksRef.current[e.nativeEvent.key]?.();
    },
    [],
  );

  return (
    <NativePill
      axis={axis}
      unionId={unionId}
      containerSpacing={containerSpacing}
      buttonSize={buttonSize}
      items={nativeItems}
      onItemPress={handleNativeEvent}
      style={style}
    />
  );
}
