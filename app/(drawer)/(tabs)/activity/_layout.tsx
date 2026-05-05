import { Stack } from "expo-router";
import { NATIVE_HEADER_LARGE, HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { DrawerSceneWrapper } from "@/components/drawer/DrawerSceneWrapper";

export default function ActivityLayout() {
  return (
    <DrawerSceneWrapper>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            ...NATIVE_HEADER_LARGE,
            headerTransparent: HEADER_TRANSPARENT,
            scrollEdgeEffects: { top: "soft" },
          }}
        />
      </Stack>
    </DrawerSceneWrapper>
  );
}
