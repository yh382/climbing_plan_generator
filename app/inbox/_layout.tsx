import { Stack } from "expo-router";
import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";

/**
 * Nested Stack for /inbox, following the same pattern as (tabs)/index/_layout.
 * Keeps inbox out of root Stack's `headerShown: false` default, so large-title
 * metrics render the same way as Home (no extra bottom padding).
 */
export default function InboxLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...NATIVE_HEADER_LARGE,
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
    </Stack>
  );
}
