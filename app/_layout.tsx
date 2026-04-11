// app/_layout.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, useColorScheme, Platform } from "react-native";
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
import BadgeUnlockToast from "../src/components/ui/BadgeUnlockToast";

import { useAuthStore } from "../src/store/useAuthStore";
import useLogsStore from "../src/store/useLogsStore";
import { runMigrationsIfNeeded } from "../src/features/journal/loglist/storage";
import { recoverOrphanedSessions } from "../src/features/journal/sync/localBackup";
import { registerForPushNotifications } from "../src/lib/pushNotifications";
import { SidebarProvider } from "../src/contexts/SidebarContext";
import { SidebarLayout, useGestureLock } from "@/components/sidebar/Sidebar";
import { syncWidgetFromStore } from "@/lib/widgetBridge";
import { endAllLiveActivities } from "../src/lib/liveActivityBridge";

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
      <Stack.Screen
        name="journal"
        options={{
          headerShown: true,
          ...NATIVE_HEADER_BASE,
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
      <Stack.Screen name="journal-ring" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="gyms" options={{ headerShown: false }} />
      <Stack.Screen name="analysis" options={{ ...NATIVE_HEADER_LARGE, headerShown: true }} />
      <Stack.Screen name="action" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ ...NATIVE_HEADER_BASE, headerShown: true }} />
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

        // Crash recovery: recover orphaned sessions from backup
        try {
          const recovery = await recoverOrphanedSessions();
          const state = useLogsStore.getState();

          if (recovery.sessions.length > 0) {
            // Dedup: skip if session already exists
            const existingKeys = new Set(state.sessions.map((s) => s.sessionKey));
            const newSessions = recovery.sessions.filter(
              (s) => !existingKeys.has(s.sessionKey)
            );
            if (newSessions.length > 0) {
              const keptLogs = state.logs.filter(
                (l) => !recovery.affectedDates.includes(l.date)
              );
              useLogsStore.setState({
                sessions: [...newSessions, ...state.sessions],
                logs: [...keptLogs, ...recovery.logEntries],
                activeSession: null,
              });
            } else if (state.activeSession) {
              useLogsStore.setState({ activeSession: null });
            }
          } else if (state.activeSession) {
            // No backup but stale activeSession → try to auto-end
            try {
              await useLogsStore.getState().endSession();
            } catch {
              useLogsStore.setState({ activeSession: null });
            }
          }
        } catch (e) {
          console.warn("[recovery]", e);
        }

        // Live Activity reconciliation: if JS thinks no session is active,
        // dismiss any orphan Live Activities left over from JS bundle reloads,
        // crashes, or force-quits where end() never fired. See:
        // - src/lib/liveActivityBridge.ts (no in-memory _hasActive flag)
        // - modules/climmate-live-activity/ios/ClimmateLiveActivityModule.swift `endAll`
        if (Platform.OS === "ios" && !useLogsStore.getState().activeSession) {
          await endAllLiveActivities();
        }

        // Sync widget data on startup
        syncWidgetFromStore();

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
      router.replace("/(tabs)" as any);
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
                  <BadgeUnlockToast />
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