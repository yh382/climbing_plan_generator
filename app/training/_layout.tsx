import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function TrainingLayout() {
  return (
    <Stack screenOptions={{ ...NATIVE_HEADER_BASE }}>
      <Stack.Screen name="exercise" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="favorites" />
    </Stack>
  );
}
