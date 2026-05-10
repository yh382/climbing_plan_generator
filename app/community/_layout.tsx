import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function CommunityLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="rank" />
      <Stack.Screen name="post/[postId]" options={{ scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="challenges" />
      <Stack.Screen name="challenges/[challengeId]" />
      <Stack.Screen name="events" />
      <Stack.Screen name="events/[eventId]" />
      <Stack.Screen name="events/create" />
      <Stack.Screen name="events/index" />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="u/[id]" options={{ scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="user-posts" options={{ title: "Posts", scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="public-plan" />
    </Stack>
  );
}
