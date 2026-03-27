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
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="help" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
