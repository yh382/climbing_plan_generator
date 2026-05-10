import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";

/**
 * Nested Stack for /coach — required for the floating-header recipe to
 * apply cleanly. On the root Stack the chrome rendered an opaque white
 * backdrop (white→grey edge), only nested Stack honors `headerTransparent
 * + scrollEdgeEffects` properly. iOS<26 keeps native translucent blur,
 * iOS 26+ gets liquid-glass floating header.
 *
 * Aligned with app/profile/_layout.tsx (NO `withHeaderTheme(colors)`) — Coach
 * sets its own title/headerLeft inside coach/index.tsx setOptions, and the
 * `withHeaderTheme` iOS<26 branch would inject `headerStyle.backgroundColor:
 * colors.background` and force the chrome opaque, conflicting with the
 * transparent recipe. (app/inbox/_layout.tsx pulls in withHeaderTheme but
 * uses NATIVE_HEADER_LARGE which needs the opaque backdrop for large title;
 * Coach is small-title only so the profile precedent is the correct fit.)
 */
export default function CoachLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen
        name="index"
        options={{
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
    </Stack>
  );
}
