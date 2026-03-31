import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="qr-code" options={{ title: "QR Code", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="badges" options={{ headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="blocked" options={{ title: "Blocked", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="comments" options={{ title: "My Comments", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="followers" options={{ headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="following" options={{ headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen
        name="library"
        options={{
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
      <Stack.Screen name="likes" options={{ title: "Likes", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="mentions" options={{ title: "Mentions", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="saved" options={{ title: "Saved", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
    </Stack>
  );
}
