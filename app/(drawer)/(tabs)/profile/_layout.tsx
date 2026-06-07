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
          // BG/BX — explicit `top: 'hidden'` (not omitted) to override
          // iOS 26's implicit Liquid Glass scrollEdge soft fade. The screen
          // installs `CollapsingHeaderBg` via setOptions to own the nav-bar
          // background; the system fade on top of that would shade the fixed
          // chrome (hero + ProfileChromeRoot tab bar). Valid values per
          // react-native-screens: 'automatic' | 'hard' | 'soft' | 'hidden'.
          scrollEdgeEffects: { top: 'hidden' },
        }}
      />
    </Stack>
  );
}
