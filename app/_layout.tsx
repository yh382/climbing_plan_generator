// app/_layout.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, useColorScheme } from "react-native";
import { Stack, SplashScreen, useRouter, useSegments } from "expo-router";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { NATIVE_HEADER_BASE, NATIVE_HEADER_LARGE } from "../src/lib/nativeHeaderOptions";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SettingsProvider } from "../src/contexts/SettingsContext";
import { useFonts } from "expo-font";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_900Black,
} from "@expo-google-fonts/dm-sans";
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import * as Notifications from "expo-notifications";

import GorillaSplash from "../src/components/GorillaSplash";
import FloatingActiveSessionTimer from "../src/features/journal/FloatingActiveSessionTimer";

import { useAuthStore } from "../src/store/useAuthStore";
import { runMigrationsIfNeeded } from "../src/features/journal/loglist/storage";
import { registerForPushNotifications } from "../src/lib/pushNotifications";
import { SidebarProvider } from "../src/contexts/SidebarContext";
import { SidebarLayout, useGestureLock } from "@/components/sidebar/Sidebar";

// Set up notification handler (must be outside component)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 1. 阻止系统启动图自动消失
SplashScreen.preventAutoHideAsync();

function FloatingTimerOverlay() {
  const segments = useSegments();
  const isInTabs = segments[0] === "(tabs)";
  if (!isInTabs) return null;
  const currentRoute = segments[1] ?? "";
  return (
    <FloatingActiveSessionTimer
      currentRouteName={currentRoute}
      tabBarHeight={49}
      offset={15}
      rightInset={10}
    />
  );
}

function RootStack() {
  const gestureEnabled = useGestureLock();

  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="library" options={{ headerShown: false }} />
      <Stack.Screen name="training" options={{ headerShown: false }} />
      <Stack.Screen name="journal" options={{ headerShown: false }} />
      <Stack.Screen name="journal-ring" options={{ headerShown: false }} />
      <Stack.Screen name="gyms" options={{ headerShown: false }} />
      <Stack.Screen
        name="gyms-sheet"
        options={{
          headerShown: false,
          presentation: "formSheet",
          gestureEnabled: false,
          sheetGrabberVisible: true,
          contentStyle: { backgroundColor: "transparent" },
          sheetAllowedDetents: [0.125, 0.45, 0.8],
          sheetInitialDetentIndex: 1,
          sheetLargestUndimmedDetentIndex: 2,
        }}
      />
      <Stack.Screen name="analysis" options={{ ...NATIVE_HEADER_LARGE, headerShown: true }} />
      <Stack.Screen name="action" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="gym-community" options={{ ...NATIVE_HEADER_BASE, headerShown: true }} />
    </Stack>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const colorScheme = useColorScheme();

  const [appIsReady, setAppIsReady] = useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  // ===== Auth hydration =====
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const accessToken = useAuthStore((s) => s.accessToken);
  const hydrate = useAuthStore((s) => s.hydrate);

  // 加载字体
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSans_900Black,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  // 初始化数据
  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([hydrate(), runMigrationsIfNeeded()]);
        // 模拟一些初始化加载时间
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, [hydrate]);

  // 路由分发逻辑
  useEffect(() => {
    if (!appIsReady || isHydrating) return;

    if (accessToken) {
      router.replace("/(tabs)");
      // Register for push notifications after login (skip on simulator)
      registerForPushNotifications().catch(() => {});
    } else {
      router.replace("/(auth)/login");
    }
  }, [appIsReady, isHydrating, accessToken, router]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // 资源准备好了，隐藏系统原生白屏
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SidebarProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              {/* 状态栏透明沉浸式，style auto 跟随系统深色模式 */}
              <StatusBar style="auto" translucent backgroundColor="transparent" />
              <SidebarLayout>
                <View style={{ flex: 1 }}>
                  <RootStack />
                  <FloatingTimerOverlay />
                </View>
              </SidebarLayout>
            </ThemeProvider>
              {/* 猩猩遮罩层：动画没播完前覆盖在最上层 */}
              {!splashAnimationFinished && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}>
                  <GorillaSplash
                    onAnimationFinish={() => {
                      setSplashAnimationFinished(true);
                    }}
                  />
                </View>
              )}
          </SidebarProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}