// src/components/ui/HeaderButton.tsx
import { Host, Button } from "@expo/ui/swift-ui";
import {
  frame,
  buttonStyle,
  labelStyle,
  glassEffect,
  font,
} from "@expo/ui/swift-ui/modifiers";
import type { StyleProp, ViewStyle } from "react-native";

type ButtonVariant =
  | "plain"
  | "bordered"
  | "borderedProminent"
  | "borderless"
  | "glass"
  | "glassProminent";

interface HeaderButtonProps {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  /** "plain" for solid headers, "glass" for floating headers (iOS 26 liquid glass) */
  variant?: ButtonVariant;
  /** Square frame size in pt. Default 34 matches the default nav-bar button. */
  size?: number;
  /** SF Symbol point size for the icon glyph. When omitted the icon
   *  uses SwiftUI's default body size. Pass to scale the icon along
   *  with `size` — matches MapTopBar's 19pt-light spec. */
  iconSize?: number;
  /** Icon weight (defaults to "light" when iconSize is set). */
  iconWeight?: "ultraLight" | "thin" | "light" | "regular" | "medium" | "semibold" | "bold" | "heavy" | "black";
  style?: StyleProp<ViewStyle>;
}

/**
 * Native SwiftUI icon button for topbar actions.
 * Auto-follows system dark/light mode tint & material.
 *
 * - variant="plain"  → bare icon (for solid-background headers)
 * - variant="glass"  → iOS 26 liquid glass circle (for floating headers)
 */
export function HeaderButton({
  icon,
  onPress,
  disabled,
  variant = "plain",
  size = 34,
  iconSize,
  iconWeight = "light",
  style,
}: HeaderButtonProps) {
  // variant="glass" → draw the button with a circular liquid-glass
  // background (matches MapTopBar LEFT_BTN). SwiftUI's `buttonStyle(.glass)`
  // renders a capsule by default, which is wrong for single icon buttons;
  // use plain button + `glassEffect(shape: .circle)` for a true circle.
  // Optional font modifier so the SF Symbol scales with the button
  // frame. Without it the glyph stays at SwiftUI's default body size,
  // which looks too small inside a 44+ pt button.
  const fontMod =
    iconSize != null ? [font({ size: iconSize, weight: iconWeight })] : [];
  const modifiers =
    variant === "glass"
      ? [
          buttonStyle("plain"),
          labelStyle("iconOnly"),
          ...fontMod,
          frame({ width: size, height: size, alignment: "center" }),
          glassEffect({
            glass: { variant: "regular", interactive: true },
            shape: "circle",
          }),
        ]
      : [
          buttonStyle(variant),
          labelStyle("iconOnly"),
          ...fontMod,
          frame({ width: size, height: size, alignment: "center" }),
        ];
  // Explicit width/height on the Host — `matchContents` updates the
  // Host's RN size from SwiftUI asynchronously, which causes a flash
  // where the Host briefly fills its parent before shrinking. For an
  // absolute-positioned button (e.g. PlaceSheetHero close at
  // top:12/right:12), that transient full-width Host visibly shoves
  // the button to the wrong x-position on first paint and reads as
  // an asymmetric layout. Locking the dimensions to `size × size`
  // upfront skips the flash entirely.
  return (
    <Host matchContents style={[{ width: size, height: size }, style]}>
      <Button
        systemImage={icon as any}
        label=""
        {...({ disabled } as Record<string, unknown>)}
        onPress={onPress}
        modifiers={modifiers as any}
      />
    </Host>
  );
}
