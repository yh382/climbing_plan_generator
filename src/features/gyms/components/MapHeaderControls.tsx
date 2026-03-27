import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Host, Button, VStack } from "@expo/ui/swift-ui";
import {
  buttonStyle,
  labelStyle,
  frame,
  font,
  glassEffect,
  clipShape,
} from "@expo/ui/swift-ui/modifiers";

interface MapControlsProps {
  isAtUser: boolean;
  styleId: "outdoors" | "satellite";
  is3D: boolean;
  onBack: () => void;
  onToggleStyle: () => void;
  onToggle3D: () => void;
  onLocate: () => void;
}

// Right-side button modifiers
const BTN = [
  buttonStyle("plain"),
  labelStyle("iconOnly"),
  font({ size: 22, weight: "light" }),
  frame({ width: 55, height: 55, alignment: "center" }),
] as const;

// Back button modifiers — single glass circle
const BACK_BTN = [
  buttonStyle("plain"),
  labelStyle("iconOnly"),
  font({ size: 22, weight: "light" }),
  frame({ width: 50, height: 50, alignment: "center" }),
  glassEffect({ glass: { variant: "regular" }, shape: "circle" }),
  clipShape("circle"),
] as const;

// VStack modifiers — single glass container wrapping right-side buttons
const GLASS_GROUP = [
  glassEffect({
    glass: { variant: "regular" },
    shape: "capsule",
  }),
  clipShape("capsule"),
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

      {/* Right-side controls */}
      <View style={styles.rightWrap}>
        <Host matchContents>
          <VStack spacing={0} modifiers={GLASS_GROUP as any}>
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
