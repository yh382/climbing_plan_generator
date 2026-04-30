import { Stack } from "expo-router";

export default function CommunityTabLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTransparent: true,
          headerTitle: "",
          headerLargeTitle: false,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
    </Stack>
  );
}
