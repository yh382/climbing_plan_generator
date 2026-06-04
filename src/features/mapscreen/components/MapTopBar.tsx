// src/features/mapscreen/components/MapTopBar.tsx
// Shared floating map top bar with iOS 26 liquid glass.
// - Optional left button (standalone glass circle, e.g. back)
// - Vertical pill on the right with 1..N buttons fused via the
//   self-contained `GlassUnionPill` native view (single SwiftUI subtree
//   owning the @Namespace; robust against RN sibling re-renders).

import React, { useEffect, useRef } from "react";
import { Animated, Platform, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Host, Button } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  labelStyle,
  frame,
  font,
  glassEffect,
} from "@expo/ui/swift-ui/modifiers";
import {
  GlassUnionPill,
  type GlassUnionPillItem,
} from "../../../../modules/glass-effect-union/src";

export interface MapTopBarButton {
  /** SF Symbol name. Required unless `count` is set. */
  icon?: string;
  /** Plain-button tap handler. */
  onPress?: () => void;
  /** Numeric badge button — renders the count as the label inside the
   *  same glass-union pill (no SF Symbol). Light-teal tinted glass +
   *  black digit; used by today's-sends counter. */
  count?: number;
  /** Render condition — if false, the item is hidden and the pill
   *  morphs the membership. */
  visible?: boolean;
  key?: string;
}

interface MapTopBarProps {
  /** Left button (standalone glass circle). */
  leftButton?: MapTopBarButton;
  /** Right button(s) — fused as one vertical pill. */
  rightButtons: MapTopBarButton[];
  /** Namespace id for the union — distinct top bars must use distinct ids. */
  unionId?: string;
  /** Fade the top bar out (e.g. when the sheet expands to a detent that
   *  would overlap with the bar). */
  hidden?: boolean;
}

const BTN_SIZE = 44;

/** Light-teal tint for the count-badge glass — visual focal point inside
 *  the otherwise neutral pill. */
const COUNT_BADGE_TINT = "#A8D5D6";

/** Display string for a count badge (clamped to "99+"). Exported so the
 *  gym detail screen can match the same clamp policy. */
export function rightPillCountLabel(count: number): string {
  return count > 99 ? "99+" : String(count);
}

// iOS<26 lacks SwiftUI's `glassEffect`; the standalone left button still
// renders inside a SwiftUI Host, but we drop a blur layer under it to
// mimic Apple Maps' iOS 18 systemMaterial floating button.
const isIOS = Platform.OS === "ios";
const iosVersion = isIOS ? parseInt(String(Platform.Version), 10) : 0;
const NEEDS_BLUR_FALLBACK = isIOS && iosVersion < 26;

function GlassBackdrop({
  children,
  borderRadius,
}: {
  children: React.ReactNode;
  borderRadius: number;
}) {
  if (!NEEDS_BLUR_FALLBACK) return <>{children}</>;
  return (
    <BlurView
      intensity={70}
      tint="systemMaterial"
      style={{ borderRadius, overflow: "hidden" }}
    >
      {children}
    </BlurView>
  );
}

const GLASS_CIRCLE = glassEffect({
  glass: { variant: "regular", interactive: true },
  shape: "circle",
});

const LEFT_BTN = [
  buttonStyle("plain"),
  labelStyle("iconOnly"),
  font({ size: 19, weight: "light" }),
  frame({ width: BTN_SIZE, height: BTN_SIZE, alignment: "center" }),
  GLASS_CIRCLE,
] as const;

function buttonToPillItem(btn: MapTopBarButton, idx: number): GlassUnionPillItem {
  const key = btn.key ?? `${btn.icon ?? "btn"}-${idx}`;
  if (typeof btn.count === "number") {
    return {
      key,
      kind: "count",
      label: rightPillCountLabel(btn.count),
      tint: COUNT_BADGE_TINT,
      foregroundColor: "#000000",
      fontSize: 17,
      fontWeight: "semibold",
      numericTransition: true,
      visible: btn.visible !== false,
      onPress: btn.onPress,
    };
  }
  return {
    key,
    kind: "icon",
    icon: btn.icon,
    visible: btn.visible !== false,
    onPress: btn.onPress,
  };
}

export function MapTopBar({
  leftButton,
  rightButtons,
  unionId = "map-pill",
  hidden,
}: MapTopBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRight = rightButtons.filter((b) => b.visible !== false);
  const pillItems = visibleRight.map(buttonToPillItem);
  const pillHeight = visibleRight.length * BTN_SIZE;

  // Fade opacity driven by `hidden` prop. Animated so the bar doesn't
  // pop in/out when the parent sheet detent changes.
  const opacity = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: hidden ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [hidden, opacity]);

  return (
    <Animated.View
      style={[styles.overlay, { top: insets.top, opacity }]}
      pointerEvents={hidden ? "none" : "box-none"}
    >
      {/* Left button */}
      <View style={styles.sideWrap}>
        {leftButton && leftButton.visible !== false && (
          <GlassBackdrop borderRadius={BTN_SIZE / 2}>
            <Host matchContents>
              <Button
                systemImage={leftButton.icon as any}
                label=""
                onPress={leftButton.onPress ?? (() => {})}
                modifiers={LEFT_BTN as any}
              />
            </Host>
          </GlassBackdrop>
        )}
      </View>

      {/* Center slot — intentionally empty; map filters live in the sheet. */}
      <View style={styles.centerWrap} />

      {/* Right vertical pill */}
      <View style={[styles.sideWrap, { height: pillHeight }]}>
        {pillItems.length > 0 && (
          <GlassUnionPill
            axis="vertical"
            unionId={unionId}
            items={pillItems}
            style={{ width: BTN_SIZE, height: pillHeight }}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    // 16pt + size=44 → button center X ≈ 38pt; matches the system nav-bar
    // button left-edge inset so map mode's back button doesn't read as
    // "lower + further left" when transitioning from a normal stack screen.
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: "row",
    // flex-start: back button (left) stays anchored to the top when the
    // right pill is taller than 44pt.
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sideWrap: {
    width: BTN_SIZE,
    alignItems: "center",
  },
  centerWrap: {
    flex: 1,
  },
});
