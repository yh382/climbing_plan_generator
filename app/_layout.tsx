// app/_layout.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Stack, SplashScreen, useRouter, useSegments } from "expo-router";
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

export default function RootLayout() {
  const router = useRouter();

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

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <SettingsProvider>
          {/* ✅ 关键：设置状态栏为透明沉浸式，配合 iOS 26 的顶部渐隐效果 */}
          <StatusBar style="auto" translucent backgroundColor="transparent" />

          <View style={{ flex: 1 }}>
            {/* 主应用导航 */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="library" options={{ headerShown: false }} />
              <Stack.Screen name="training" options={{ headerShown: false }} />
              <Stack.Screen name="journal" options={{ headerShown: false }} />
              <Stack.Screen name="journal-ring" options={{ headerShown: false }} />
              <Stack.Screen name="gyms" options={{ headerShown: false }} />
              <Stack.Screen name="analysis" options={{ headerShown: false }} />
              <Stack.Screen name="coach" options={{ headerShown: false }} />
              <Stack.Screen name="action" options={{ headerShown: false }} />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
            </Stack>

            <FloatingTimerOverlay />

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
          </View>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}