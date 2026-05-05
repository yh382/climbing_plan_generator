// Gym stack layout — mirrors outdoor's pattern. The map screen
// (`[gymId]`) hides the header for its custom top bar; child detail
// pages get a transparent native header so back/toolbar render natively.

import { Stack } from 'expo-router';
import { useThemeColors } from "@/lib/useThemeColors";
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE, HEADER_TRANSPARENT, withHeaderTheme } from '@/lib/nativeHeaderOptions';

export default function GymLayout() {
  
  const colors = useThemeColors();return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen
        name="[gymId]"
        options={{ headerShown: false }}
      />
      {/* The `route/` subfolder has its own nested Stack — let it own
          the header. Without this override, the outer Stack's default
          header stacks on top of route/[routeId]'s transparent header
          (visible as a second blank bar above the route photo). */}
      <Stack.Screen
        name="route"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="route-beta"
        options={{
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
      <Stack.Screen
        name="route-climbers"
        options={{
          ...NATIVE_HEADER_LARGE,
          ...withHeaderTheme(colors),
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
    </Stack>
  );
}
