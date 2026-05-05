import { Stack, useRouter } from "expo-router";
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE, HEADER_TRANSPARENT, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useThemeColors } from "@/lib/useThemeColors";

export default function SettingsSubLayout() {
  const router = useRouter();
  const colors = useThemeColors();
  const themed = withHeaderTheme(colors);

  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE, ...themed }}>
      <Stack.Screen
        name="index"
        options={{
          ...NATIVE_HEADER_LARGE,
          ...themed,
          headerShown: true,
        }}
      />
      <Stack.Screen name="notifications" options={{ ...NATIVE_HEADER_LARGE, ...themed, title: "Notifications", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="privacy" options={{ ...NATIVE_HEADER_LARGE, ...themed, title: "Privacy", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
      <Stack.Screen name="help" options={{ ...NATIVE_HEADER_LARGE, ...themed, title: "Help", headerTransparent: HEADER_TRANSPARENT, scrollEdgeEffects: { top: 'soft' } }} />
    </Stack>
  );
}
