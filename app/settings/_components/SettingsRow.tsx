// app/settings/_components/SettingsRow.tsx
// Re-usable row for Settings screens — iOS-Settings-style icon + label
// + trailing chevron, fully tappable across the row width.
//
// SwiftUI <Button buttonStyle("plain")> + frame(maxWidth: .infinity)
// makes the entire HStack the hit target (vs. just the icon+text bbox).
// The chevron is a manual SF Symbol because plain-style buttons don't
// auto-render disclosure indicators inside <Form><Section>.
import React from "react";
import { Button, HStack, Image, Spacer, Text, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  frame,
  shapes,
} from "@expo/ui/swift-ui/modifiers";

import { useThemeColors } from "src/lib/useThemeColors";

type SFSymbolName = NonNullable<React.ComponentProps<typeof Image>["systemName"]>;

type Props = {
  icon: SFSymbolName;
  iconBg: string;
  label: string;
  onPress: () => void;
};

export function SettingsRow({ icon, iconBg, label, onPress }: Props) {
  const colors = useThemeColors();
  return (
    <Button
      onPress={onPress}
      modifiers={[buttonStyle("plain"), frame({ maxWidth: 9999 })]}
    >
      <HStack spacing={12} alignment="center">
        <ZStack
          alignment="center"
          modifiers={[
            frame({ width: 28, height: 28 }),
            background(iconBg, shapes.roundedRectangle({ cornerRadius: 6 })),
          ]}
        >
          <Image systemName={icon} size={16} color="#FFFFFF" />
        </ZStack>
        <Text>{label}</Text>
        <Spacer />
        <Image
          systemName="chevron.right"
          size={13}
          color={colors.textTertiary}
        />
      </HStack>
    </Button>
  );
}
