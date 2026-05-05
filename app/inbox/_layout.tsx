import { Stack } from "expo-router";
import { NATIVE_HEADER_LARGE, HEADER_TRANSPARENT, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useThemeColors } from "@/lib/useThemeColors";

/**
 * Nested Stack for /inbox, following the same pattern as (tabs)/index/_layout.
 * Keeps inbox out of root Stack's `headerShown: false` default, so large-title
 * metrics render the same way as Home (no extra bottom padding).
 */
export default function InboxLayout() {
  const colors = useThemeColors();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...NATIVE_HEADER_LARGE,
          ...withHeaderTheme(colors),
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
    </Stack>
  );
}
