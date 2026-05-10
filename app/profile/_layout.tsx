import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="qr-code" options={{ title: "QR Code", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="badges" options={{ headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="blocked" options={{ title: "Blocked", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="comments" options={{ title: "My Comments", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="followers" options={{ headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="following" options={{ headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen
        name="library"
        options={{
          headerTransparent: HEADER_TRANSPARENT,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
      <Stack.Screen name="likes" options={{ title: "Likes", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="mentions" options={{ title: "Mentions", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="saved" options={{ title: "Saved", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="lists" options={{ headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="lists/[listId]" options={{ headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      {/* recent-climbs / body-info are formSheet routes — registered in
          app/_layout.tsx (root native-stack) instead of here, because
          presentation: 'formSheet' on a nested-stack screen can fall back
          to a regular push animation. */}
    </Stack>
  );
}
