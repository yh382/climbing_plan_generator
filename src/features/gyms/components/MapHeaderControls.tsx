import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, Button, VStack, GlassEffectContainer } from "@expo/ui/swift-ui";
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

interface MapControlsProps {
  isAtUser: boolean;
  styleId: "outdoors" | "satellite";
  is3D: boolean;
  onBack: () => void;
  onToggleStyle: () => void;
  onToggle3D: () => void;
  onLocate: () => void;
}

// Shared button size. Width must be identical between BACK_BTN and BTN so
// the back button's circle radius equals the right-side capsule's radius
// (capsule corner radius = width / 2). Sized for easy tapping on a floating
// map overlay while staying meaningfully smaller than the old 50/55pt.
const BTN_SIZE = 48;

// iOS 26 "liquid glass" pattern used by Apple Maps / Slopes:
//
//   1. `buttonStyle("plain")` — strip SwiftUI's default button styling so
//      we control the glass background ourselves.
//   2. `glassEffect({ glass: { interactive: true }, shape: "capsule" })` —
//      per-button liquid glass material. `interactive: true` enables the
//      native press-scale animation + haptic feedback.
//   3. `glassEffectUnion("map-pill")` — binds all three buttons to the
//      same SwiftUI `@Namespace` (provided by `<GlassUnionGroup>`) so
//      SwiftUI renders them as a single seamless vertical pill. This is
//      the real `glassEffectUnion(id:namespace:)` SwiftUI API bridged
//      through a local expo module (`modules/glass-effect-union`) since
//      `@expo/ui` doesn't expose it out of the box.
const GLASS_CIRCLE = glassEffect({
  glass: { variant: "regular", interactive: true },
  shape: "circle",
});

const GLASS_CAPSULE = glassEffect({
  glass: { variant: "regular", interactive: true },
  shape: "capsule",
});

// Right-side button modifiers. Each button carries its own capsule glass
// and a `glassEffectUnion("map-pill")` tag; SwiftUI fuses all buttons
// sharing that id (inside the same `<GlassUnionGroup>` namespace) into
// one continuous vertical pill with per-button press animations intact.
const BTN = [
  buttonStyle("plain"),
  labelStyle("iconOnly"),
  font({ size: 19, weight: "light" }),
  frame({ width: BTN_SIZE, height: BTN_SIZE, alignment: "center" }),
  GLASS_CAPSULE,
  glassEffectUnion("map-pill"),
] as const;

// Back button modifiers — standalone glass circle.
const BACK_BTN = [
  buttonStyle("plain"),
  labelStyle("iconOnly"),
  font({ size: 19, weight: "light" }),
  frame({ width: BTN_SIZE, height: BTN_SIZE, alignment: "center" }),
  GLASS_CIRCLE,
] as const;

/** Floating map controls: back button (left) + vertical controls (right). */
export function MapControls({
  isAtUser,
  styleId,
  is3D,
  onBack,
  onToggleStyle,
  onToggle3D,
  onLocate,
}: MapControlsProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.overlay, { top: insets.top + 8 }]} pointerEvents="box-none">
      {/* Back button — left */}
      <View style={styles.backWrap}>
        <Host matchContents>
          <Button
            systemImage={"chevron.left" as any}
            label=""
            onPress={onBack}
            modifiers={BACK_BTN as any}
          />
        </Host>
      </View>

      {/* Right-side controls — three capsule glass buttons bound by a
          shared SwiftUI `@Namespace` (via `<GlassUnionGroup>`) and the
          `glassEffectUnion("map-pill")` modifier. SwiftUI fuses them
          into one seamless vertical pill with native press animations.
          `<GlassEffectContainer>` remains the required morph context for
          any iOS 26 glass effect; `spacing={20}` gives the
          locate-button mount/unmount transition room to animate. */}
      <View style={styles.rightWrap}>
        <Host matchContents>
          <GlassEffectContainer spacing={20}>
            <GlassUnionGroup>
              <VStack spacing={0}>
                <Button
                  systemImage={(styleId === "outdoors" ? "square.3.layers.3d.down.left" : "photo") as any}
                  label=""
                  onPress={onToggleStyle}
                  modifiers={BTN as any}
                />
                <Button
                  systemImage={(is3D ? "cube.fill" : "cube") as any}
                  label=""
                  onPress={onToggle3D}
                  modifiers={BTN as any}
                />
                {!isAtUser && (
                  <Button
                    systemImage={"location" as any}
                    label=""
                    onPress={onLocate}
                    modifiers={BTN as any}
                  />
                )}
              </VStack>
            </GlassUnionGroup>
          </GlassEffectContainer>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  backWrap: {},
  rightWrap: {},
});
