import { Stack } from "expo-router";
import { NATIVE_HEADER_LARGE, HEADER_TRANSPARENT, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { useThemeColors } from "@/lib/useThemeColors";
import { DrawerSceneWrapper } from "@/components/drawer/DrawerSceneWrapper";

export default function ActivityLayout() {
  const colors = useThemeColors();
  return (
    <DrawerSceneWrapper>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            ...NATIVE_HEADER_LARGE,
            ...withHeaderTheme(colors),
            headerTransparent: HEADER_TRANSPARENT,
            scrollEdgeEffects: { top: "soft" },
          }}
        />
      </Stack>
    </DrawerSceneWrapper>
  );
}
