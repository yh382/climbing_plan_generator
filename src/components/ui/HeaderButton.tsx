// src/components/ui/HeaderButton.tsx
import { Host, Button } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
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
  style,
}: HeaderButtonProps) {
  return (
    <Host matchContents style={style}>
      <Button
        systemImage={icon as any}
        label=""
        {...({ disabled } as Record<string, unknown>)}
        onPress={onPress}
        modifiers={[buttonStyle(variant), labelStyle("iconOnly"), frame({ width: 34, height: 34, alignment: "center" })]}
      />
    </Host>
  );
}
