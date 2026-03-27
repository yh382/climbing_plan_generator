import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="post/[postId]" options={{ scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="challenges/[challengeId]" />
      <Stack.Screen name="activities" />
      <Stack.Screen name="create" options={{ title: "New Post" }} />
      <Stack.Screen name="select-session" options={{ presentation: 'modal', title: 'Select Session' }} />
      <Stack.Screen name="select-plan" options={{ presentation: 'modal', title: 'Select Plan' }} />
      <Stack.Screen name="events" />
      <Stack.Screen name="events/[eventId]" />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="events/index" />
      <Stack.Screen name="media-select" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="u/[id]" options={{ scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="public-plan" />
      <Stack.Screen name="public-route-log" />
      <Stack.Screen name="workout-record" />
    </Stack>
  );
}
