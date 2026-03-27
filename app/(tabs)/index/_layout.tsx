import { Stack } from "expo-router";
import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={NATIVE_HEADER_LARGE}
      />
    </Stack>
  );
}
