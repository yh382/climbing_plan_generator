// app/outdoor/_layout.tsx
// Stack navigator for outdoor climbing pages

import { Stack } from 'expo-router';
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE } from '@/lib/nativeHeaderOptions';

export default function OutdoorLayout() {
  return (
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
          headerTransparent: true,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
      <Stack.Screen
        name="crag-community"
        options={{
          ...NATIVE_HEADER_LARGE,
          headerTransparent: true,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
      <Stack.Screen
        name="route-beta"
        options={{
          headerTransparent: true,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
      <Stack.Screen
        name="route-climbers"
        options={{
          ...NATIVE_HEADER_LARGE,
          headerTransparent: true,
          scrollEdgeEffects: { top: 'soft' },
        }}
      />
    </Stack>
  );
}
