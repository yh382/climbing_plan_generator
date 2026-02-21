// app/_layout.tsx
import "react-native-gesture-handler";
import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Stack, SplashScreen, useRouter } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar"; // 引入 StatusBar
import { SettingsProvider } from "../src/contexts/SettingsContext";
import { useFonts } from "expo-font";

// 引入您的猩猩动画组件
import GorillaSplash from "../src/components/GorillaSplash";

// ✅ Auth store
import { useAuthStore } from "../src/store/useAuthStore";

// 1. 阻止系统启动图自动消失
SplashScreen.preventAutoHideAsync();

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
    // 如果有自定义字体可以在这里添加
  });

  // 初始化数据
  useEffect(() => {
    async function prepare() {
      try {
        await hydrate();
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
            </Stack>

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