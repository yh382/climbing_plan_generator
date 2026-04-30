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
import { recoverOrphanedSessions, readBackupSnapshot } from "../src/features/journal/sync/localBackup";
import { registerForPushNotifications } from "../src/lib/pushNotifications";
import { handlePushTap, handleColdStartPushTap } from "../src/lib/pushTapHandler";
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
  const tabsIdx = segments.indexOf("(tabs)" as never);
  if (tabsIdx === -1) return null;
  const currentRoute = (segments[tabsIdx + 1] as string) ?? "";
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
  const scheme = useColorScheme();
  const drawerBg = scheme === "dark" ? "#1A1F17" : "#F7F8F5";
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="(drawer)"
        options={{
          headerShown: false,
          // Match drawer bg so the rounded-corner cutout behind Home Stack
          // blends seamlessly with the drawer when open. Otherwise
          // react-navigation's default colors.background (#F2F2F2) shows.
          contentStyle: { backgroundColor: drawerBg },
        }}
      />
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
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="gyms" options={{ headerShown: false }} />
      <Stack.Screen name="map" options={{ headerShown: false }} />
      <Stack.Screen name="analysis" options={{ ...NATIVE_HEADER_LARGE, headerShown: true }} />
      <Stack.Screen name="action" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ ...NATIVE_HEADER_BASE, headerShown: true }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="gym-community" options={{ ...NATIVE_HEADER_BASE, headerShown: true }} />
      <Stack.Screen name="inbox" options={{ headerShown: false }} />
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

        // Wait for useLogsStore hydration so activeSession is reliable.
        if (!useLogsStore.getState()._hydrated) {
          await new Promise<void>((resolve) => {
            const unsub = useLogsStore.subscribe((s) => {
              if (s._hydrated) { unsub(); resolve(); }
            });
            // Safety timeout: if hydration never fires within 5s, proceed anyway
            setTimeout(() => { unsub(); resolve(); }, 5000);
          });
        }

        // Crash recovery: recover orphaned sessions from backup.
        // KEY: If activeSession is still alive and matches the backup,
        // this is NOT a crash — it's a normal app restart mid-session
        // (e.g. iOS killed the app in background). Skip recovery to
        // preserve the active session and its Live Activity.
        try {
          const backup = await readBackupSnapshot();
          const state = useLogsStore.getState();
          const activeKey = state.activeSession
            ? String(state.activeSession.startTime)
            : null;

          if (backup && activeKey === backup.sessionKey) {
            // Session is still active — do NOT recover or end anything.
            if (__DEV__) console.log("[recovery] active session matches backup, skipping recovery");
          } else {
            const recovery = await recoverOrphanedSessions();

            if (recovery.sessions.length > 0) {
              const freshState = useLogsStore.getState();
              const existingKeys = new Set(freshState.sessions.map((s) => s.sessionKey));
              const newSessions = recovery.sessions.filter(
                (s) => !existingKeys.has(s.sessionKey)
              );
              if (newSessions.length > 0) {
                const keptLogs = freshState.logs.filter(
                  (l) => !recovery.affectedDates.includes(l.date)
                );
                useLogsStore.setState({
                  sessions: [...newSessions, ...freshState.sessions],
                  logs: [...keptLogs, ...recovery.logEntries],
                  activeSession: null,
                });
              } else if (freshState.activeSession) {
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
          }
        } catch (e) {
          console.warn("[recovery]", e);
        }

        // Live Activity reconciliation: if JS thinks no session is active,
        // dismiss any orphan Live Activities left over from JS bundle reloads,
        // crashes, or force-quits where end() never fired.
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
      router.replace("/(drawer)/(tabs)" as any);
      // Register for push notifications after login (skip on simulator)
      registerForPushNotifications().catch(() => {});
      // Cold-start: if the app was launched by tapping a push banner, route there once.
      handleColdStartPushTap();
    } else {
      router.replace("/(auth)/login");
    }
  }, [appIsReady, isHydrating, accessToken, router]);

  // Tap handler for push notifications while app is foreground/background.
  // Registered once at root — module-level `router` in handler means it works
  // regardless of current screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handlePushTap);
    return () => sub.remove();
  }, []);

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
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            {/* 状态栏透明沉浸式，style auto 跟随系统深色模式 */}
            <StatusBar style="auto" translucent backgroundColor="transparent" />
            <View style={{ flex: 1 }}>
              <RootStack />
              <FloatingTimerOverlay />
              <BadgeUnlockToast />
            </View>
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
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}