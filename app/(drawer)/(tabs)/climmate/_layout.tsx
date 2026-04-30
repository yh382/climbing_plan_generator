import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function ClimmateLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...NATIVE_HEADER_BASE,
          headerLargeTitle: false,
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
    </Stack>
  );
}
