// src/components/ui/Avatar.tsx
// Lightweight circular avatar with initial-letter fallback.

import { View, Text } from "react-native";
import { Image } from "expo-image";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";

type Props = {
  uri?: string | null;
  fallbackName?: string | null;
  size?: number;
};

export function Avatar({ uri, fallbackName, size = 32 }: Props) {
  const colors = useThemeColors();
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  const initial = (fallbackName ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.cardDark,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontFamily: theme.fonts.bold,
          fontSize: Math.round(size * 0.45),
        }}
      >
        {initial}
      </Text>
    </View>
  );
}
