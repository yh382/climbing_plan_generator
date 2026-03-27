import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="badges" />
      <Stack.Screen name="blocked" />
      <Stack.Screen name="comments" />
      <Stack.Screen name="edit" options={{ title: "Edit Profile" }} />
      <Stack.Screen name="followers" />
      <Stack.Screen name="following" />
      <Stack.Screen name="library" />
      <Stack.Screen name="likes" />
      <Stack.Screen name="mentions" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="stats" />
    </Stack>
  );
}
