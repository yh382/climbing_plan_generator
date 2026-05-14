import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          // Profile is the one screen where we WANT a fully transparent
          // header on every iOS version — the cover image extends edge-to-
          // edge under the floating settings/share buttons. iOS 17/18 falls
          // back gracefully (icons stay readable on the cover image bg).
          headerTransparent: true,
          headerTitle: "",
          headerLargeTitle: false,
          // BG fix — explicit `top: 'hidden'` (not omitted) to override
          // iOS 26's implicit Liquid Glass scrollEdge soft fade. Window
          // BG installs `CollapsingHeaderBg` via setOptions to handle the
          // nav-bar background ourselves; the system fade on top of that
          // shaded the sticky `StickyProfileTabBar`'s upper half because
          // the bar is inside the scrollview content. Valid values per
          // react-native-screens: 'automatic' | 'hard' | 'soft' | 'hidden'.
          scrollEdgeEffects: { top: 'hidden' },
        }}
      />
    </Stack>
  );
}
