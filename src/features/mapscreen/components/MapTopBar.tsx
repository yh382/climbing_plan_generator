// src/features/mapscreen/components/MapTopBar.tsx
// Shared floating map top bar with iOS 26 liquid glass.
// - Optional left button (standalone glass circle, e.g. back)
// - Vertical pill on the right with 1..N buttons fused by glassEffectUnion
// - Right buttons support three modes:
//     * plain onPress — simple tap handler
//     * menuItems — SwiftUI `Menu` dropdown popover (tap-open)
//     * morphMenuItems — inline-morph pill: tap grows the pill with extra
//       buttons stacked inside the same glass union (iOS 26 toolbar feel).

import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Host, Button, VStack, GlassEffectContainer, Menu } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  labelStyle,
  frame,
  font,
  glassEffect,
} from "@expo/ui/swift-ui/modifiers";
import {
  GlassUnionGroup,
  glassEffectUnion,
} from "../../../../modules/glass-effect-union/src";

export interface MapTopBarMenuItem {
  title: string;
  icon?: string;
  onPress: () => void;
}

export interface MapTopBarButton {
  icon: string; // SF Symbol name
  /** Plain-button tap handler. Ignored if menuItems or morphMenuItems are set. */
  onPress?: () => void;
  /** SwiftUI Menu dropdown (tap opens a popover). */
  menuItems?: MapTopBarMenuItem[];
  /** Inline-morph: tap grows the pill with these items stacked above the
   *  trigger. Items share the same glass union so the pill reads as one
   *  continuous liquid-glass capsule. */
  morphMenuItems?: MapTopBarMenuItem[];
  /** Render condition — if false, button is hidden. */
  visible?: boolean;
  key?: string;
}

interface MapTopBarProps {
  /** Left button (standalone glass circle) */
  leftButton?: MapTopBarButton;
  /** Right button(s) — fused as one vertical pill */
  rightButtons: MapTopBarButton[];
  /** Namespace id for glassEffectUnion — ensures independent top bars don't fuse */
  unionId?: string;
  /** When true, fade the top bar out of view (e.g. when the parent sheet
   *  expands to a detent that would overlap with the bar). */
  hidden?: boolean;
  /** Extra node rendered in the right column below the fused right pill. */
  belowRight?: React.ReactNode;
}

const BTN_SIZE = 44;

// iOS<26 lacks SwiftUI's `glassEffect` (Liquid Glass landed in iOS 26),
// so the buttons render as bare icons floating on the map. Apple Maps on
// iOS 18 uses UIBlurEffect.systemMaterial — we mimic that with expo-blur.
// On iOS≥26 the SwiftUI Host's own glassEffect modifier draws the
// material; we just render a transparent passthrough so the two layers
// don't double up.
const isIOS = Platform.OS === "ios";
const iosVersion = isIOS ? parseInt(String(Platform.Version), 10) : 0;
const NEEDS_BLUR_FALLBACK = isIOS && iosVersion < 26;

function GlassBackdrop({
  children,
  borderRadius,
  style,
}: {
  children: React.ReactNode;
  borderRadius: number;
  style?: any;
}) {
  if (!NEEDS_BLUR_FALLBACK) return <>{children}</>;
  return (
    <BlurView
      intensity={70}
      tint="systemMaterial"
      style={[{ borderRadius, overflow: "hidden" }, style]}
    >
      {children}
    </BlurView>
  );
}

const GLASS_CIRCLE = glassEffect({
  glass: { variant: "regular", interactive: true },
  shape: "circle",
});

const GLASS_CAPSULE = glassEffect({
  glass: { variant: "regular", interactive: true },
  shape: "capsule",
});

function rightButtonModifiers(unionId: string) {
  return [
    buttonStyle("plain"),
    labelStyle("iconOnly"),
    font({ size: 19, weight: "light" }),
    frame({ width: BTN_SIZE, height: BTN_SIZE, alignment: "center" }),
    GLASS_CAPSULE,
    glassEffectUnion(unionId),
  ] as const;
}

const LEFT_BTN = [
  buttonStyle("plain"),
  labelStyle("iconOnly"),
  font({ size: 19, weight: "light" }),
  frame({ width: BTN_SIZE, height: BTN_SIZE, alignment: "center" }),
  GLASS_CIRCLE,
] as const;

export function MapTopBar({ leftButton, rightButtons, unionId = "map-pill", hidden, belowRight }: MapTopBarProps) {
  const insets = useSafeAreaInsets();
  const RIGHT_BTN = rightButtonModifiers(unionId);
  const visibleRight = rightButtons.filter((b) => b.visible !== false);

  // Tracks which button (by key) currently has its morph menu expanded.
  // Only one morph menu can be expanded at a time; tapping a different
  // morph button or tapping outside the pill collapses it.
  const [expandedMenuKey, setExpandedMenuKey] = useState<string | null>(null);

  // Fade opacity driven by `hidden` prop. Animated so the bar doesn't
  // pop in/out when the parent sheet detent changes.
  const opacity = useRef(new Animated.Value(hidden ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: hidden ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
    // Collapse any open morph menu when fading out so it doesn't flash
    // back when the bar re-appears.
    if (hidden) setExpandedMenuKey(null);
  }, [hidden, opacity]);

  return (
    <>
      {/* Dismissal overlay — full-screen transparent Pressable that catches
          taps anywhere outside the pill and collapses the morph menu.
          zIndex 49 sits below the top bar (50) so the pill stays tappable. */}
      {expandedMenuKey && (
        <Pressable
          style={[styles.dismissOverlay, { top: 0 }]}
          onPress={() => setExpandedMenuKey(null)}
        />
      )}

      <Animated.View
        style={[styles.overlay, { top: insets.top + 8, opacity }]}
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

        {/* Center slot — intentionally empty; map filters live in the sheet now. */}
        <View style={styles.centerWrap} />

        {/* Right vertical pill */}
        <View style={styles.sideWrap}>
          {visibleRight.length > 0 && (
            <GlassBackdrop borderRadius={BTN_SIZE / 2}>
            <Host matchContents>
              <GlassEffectContainer spacing={20}>
                <GlassUnionGroup>
                  <VStack spacing={0}>
                    {visibleRight.flatMap((btn, i) => {
                      const key = btn.key ?? `${btn.icon}-${i}`;
                      const isExpanded = expandedMenuKey === key;

                      // Inline-morph menu: when expanded, render the morph
                      // items as extra Buttons ABOVE the trigger so the pill
                      // grows upward. All buttons share `glassEffectUnion`
                      // so SwiftUI fuses them into one continuous glass pill.
                      if (btn.morphMenuItems && btn.morphMenuItems.length > 0) {
                        // Trigger first (top), menu items render BELOW it when
                        // expanded. Combined with `alignItems: flex-start` on
                        // the overlay, the trigger stays anchored at its
                        // original y-position and the pill grows downward —
                        // the back button on the left doesn't shift.
                        const nodes: React.ReactElement[] = [
                          <Button
                            key={key}
                            systemImage={(isExpanded ? "xmark" : btn.icon) as any}
                            label=""
                            onPress={() => setExpandedMenuKey(isExpanded ? null : key)}
                            modifiers={RIGHT_BTN as any}
                          />,
                        ];
                        if (isExpanded) {
                          btn.morphMenuItems.forEach((m, j) => {
                            nodes.push(
                              <Button
                                key={`${key}-item-${j}`}
                                systemImage={(m.icon ?? "") as any}
                                label=""
                                onPress={() => {
                                  m.onPress();
                                  setExpandedMenuKey(null);
                                }}
                                modifiers={RIGHT_BTN as any}
                              />,
                            );
                          });
                        }
                        return nodes;
                      }

                      // SwiftUI Menu dropdown
                      if (btn.menuItems && btn.menuItems.length > 0) {
                        return [
                          <Menu
                            key={key}
                            label=""
                            systemImage={btn.icon}
                            modifiers={RIGHT_BTN as any}
                          >
                            {btn.menuItems.map((m, j) => (
                              <Button
                                key={`${m.title}-${j}`}
                                systemImage={(m.icon ?? "") as any}
                                onPress={m.onPress}
                                label={m.title}
                              />
                            ))}
                          </Menu>,
                        ];
                      }

                      // Plain button
                      return [
                        <Button
                          key={key}
                          systemImage={btn.icon as any}
                          label=""
                          onPress={btn.onPress ?? (() => {})}
                          modifiers={RIGHT_BTN as any}
                        />,
                      ];
                    })}
                  </VStack>
                </GlassUnionGroup>
              </GlassEffectContainer>
            </Host>
            </GlassBackdrop>
          )}
        </View>

        {/* B1 — `belowRight` is rendered as an ABSOLUTE overlay, NOT as a
            sibling inside the right `sideWrap` View. Reason: any RN View
            placed as a sibling to the SwiftUI Host that hosts the
            glass-union'd right pill silently breaks the SwiftUI
            @Namespace registration for `glassEffectUnion`, which causes
            the fused capsule to fall apart into 3 disconnected buttons
            (verified by binary-bisecting B1 regression). Lifting it
            outside sideWrap preserves the union; absolute positioning
            (top = visibleRight.length * BTN_SIZE + 8) keeps it visually
            below the right pill regardless of how many buttons render. */}
        {belowRight ? (
          <View
            style={[
              styles.belowRightAbsolute,
              { top: visibleRight.length * BTN_SIZE + 8 },
            ]}
            pointerEvents="box-none"
          >
            {belowRight}
          </View>
        ) : null}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 50,
    flexDirection: "row",
    // flex-start: back button (left) stays anchored to the top when the
    // right-side morph pill grows downward. With `center` the back button
    // would shift down along with pill height.
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
  dismissOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 49,
  },
  // Absolute-positioned outside sideWrap so it isn't an RN sibling to
  // the SwiftUI Host (see B1 binary-bisect comment in render).
  belowRightAbsolute: {
    position: "absolute",
    right: 0,
    width: BTN_SIZE,
    alignItems: "center",
  },
});
