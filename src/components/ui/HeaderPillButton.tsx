// src/components/ui/HeaderPillButton.tsx
import { Host, Button } from "@expo/ui/swift-ui";
import type { StyleProp, ViewStyle } from "react-native";

interface HeaderPillButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native SwiftUI pill button for topbar text actions (Save, Post, etc.).
 * Auto-follows system dark/light mode.
 */
export function HeaderPillButton({ title, onPress, disabled, loading, style }: HeaderPillButtonProps) {
  const extraProps = {
    variant: "borderedProminent",
    controlSize: "small",
    color: "#1C1C1E",
    disabled: disabled || loading,
  } as Record<string, unknown>;

  return (
    <Host matchContents style={style}>
      <Button
        {...extraProps}
        onPress={onPress}
        label={loading ? "..." : title}
      />
    </Host>
  );
}
