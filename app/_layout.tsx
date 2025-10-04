import "react-native-gesture-handler";
import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SettingsProvider } from "@/contexts/SettingsContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <Stack screenOptions={{ headerShown: false}}>
            {/* 显式以 (tabs) 作为根入口，保持底部 Tabs 常驻 */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
