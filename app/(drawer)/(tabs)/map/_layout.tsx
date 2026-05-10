import { Stack } from "expo-router";
import { DrawerSceneWrapper } from "@/components/drawer/DrawerSceneWrapper";

// Map tab — MapScreenMapbox owns its own MapTopBar (no native header).
export default function MapLayout() {
  return (
    <DrawerSceneWrapper>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </DrawerSceneWrapper>
  );
}
