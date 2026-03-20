// app/training/_layout.tsx
import { Stack } from "expo-router";

export default function TrainingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="exercise" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="favorites" />
    </Stack>
  );
}
