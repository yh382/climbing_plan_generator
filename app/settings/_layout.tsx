import { Stack, useRouter } from "expo-router";
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";

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
      <Stack.Screen name="notifications" options={{ title: "Notifications", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="help" options={{ title: "Help", headerTransparent: true, scrollEdgeEffects: { top: 'soft' } }} />
    </Stack>
  );
}
