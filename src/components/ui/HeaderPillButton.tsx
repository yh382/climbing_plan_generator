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
  return (
    <Host matchContents style={style}>
      <Button
        variant="borderedProminent"
        controlSize="small"
        color="#1C1C1E"
        disabled={disabled || loading}
        onPress={onPress}
      >
        {loading ? "..." : title}
      </Button>
    </Host>
  );
}
