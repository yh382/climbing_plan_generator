import { Stack } from "expo-router";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTransparent: HEADER_TRANSPARENT,
          headerTitle: "",
          headerLargeTitle: false,
          scrollEdgeEffects: {
            top: 'soft',
          },
        }}
      />
    </Stack>
  );
}
