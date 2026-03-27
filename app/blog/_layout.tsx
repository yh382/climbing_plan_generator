import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function BlogLayout() {
  return <Stack screenOptions={{ ...NATIVE_HEADER_BASE }} />;
}
