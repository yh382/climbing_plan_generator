// components/ui/Card.tsx
import { View, ViewProps } from "react-native";
import { tokens } from "./Theme";

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: tokens.color.card,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: tokens.color.border,
          padding: tokens.space(4),
        },
        tokens.shadow.card,
        style,
      ]}
      {...rest}
    />
  );
}
