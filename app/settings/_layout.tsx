import { Stack, useRouter } from "expo-router";
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";

export default function SettingsSubLayout() {
  const router = useRouter();

  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen
        name="index"
        options={{
          ...NATIVE_HEADER_LARGE,
          headerShown: true,
        }}
      />
      <Stack.Screen name="notifications" options={{ title: "Notifications", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="help" options={{ title: "Help", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
    </Stack>
  );
}
