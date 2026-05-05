// app/outdoor/_layout.tsx
// Stack navigator for outdoor climbing pages

import { Stack } from 'expo-router';
import { useThemeColors } from "@/lib/useThemeColors";
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE, HEADER_TRANSPARENT, withHeaderTheme } from '@/lib/nativeHeaderOptions';

export default function OutdoorLayout() {
  
  const colors = useThemeColors();return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen
        name="crag-map"
        options={{
          headerShown: false, // Full-screen map with custom top bar
        }}
      />
      <Stack.Screen
        name="outdoor-route-detail"
        options={{
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
      <Stack.Screen
        name="crag-community"
        options={{
          ...NATIVE_HEADER_LARGE,
          ...withHeaderTheme(colors),
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: 'soft' },
        }}
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
