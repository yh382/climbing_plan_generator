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
          scrollEdgeEffects: {
            top: 'soft',
          },
        }}
      />
    </Stack>
  );
}
