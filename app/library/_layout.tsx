import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function LibraryLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="generator" />
      <Stack.Screen name="my-plans" />
      <Stack.Screen name="exercise-categories" />
      <Stack.Screen name="exercise-detail" />
      <Stack.Screen name="exercise-favorites" />
      <Stack.Screen name="exercises" />
      <Stack.Screen name="plan-builder" options={{ headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="plan-detail" />
      <Stack.Screen name="plan-history" />
      <Stack.Screen name="plan-overview" />
      <Stack.Screen name="plan-view" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="route-detail" options={{ headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="trending-plans" options={{ headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="log-detail" />
    </Stack>
  );
}
