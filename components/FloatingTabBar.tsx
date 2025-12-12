// src/components/FloatingTabBar.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  useColorScheme,
  Animated,
  Text,
  Dimensions,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSettings } from "src/contexts/SettingsContext";
import { TabActions } from "@react-navigation/native";
import { BlurView } from "expo-blur"; // 核心：毛玻璃组件

import {
  FLOATING_TAB_BAR_ICON_BUTTON_SIZE,
} from "./FloatingTabBar.constants";

import FloatingActionsSheet, {
  FloatingActionItem,
} from "./FloatingActionsSheet";

// 定义胶囊的宽度和高度
const screenWidth = Dimensions.get('window').width;
const CAPSULE_WIDTH = Math.min(screenWidth - 40, 420);
const CAPSULE_HEIGHT = 60; // 胶囊高度

const ICONS: Record<string, { active: any; inactive: any; label: string }> = {
  home: { active: "home", inactive: "home-outline", label: "Home" },
  index: { active: "add", inactive: "add", label: "Generator" },
  calendar: { active: "calendar", inactive: "calendar-outline", label: "Session" },
  analysis: { active: "stats-chart", inactive: "stats-chart-outline", label: "Analysis" },
  profile: { active: "person", inactive: "person-outline", label: "Profile" },
  gyms: { active: "map", inactive: "map-outline", label: "Gyms" },
};

const PARENT_TAB_OF: Record<string, "calendar" | "journal" | "profile" | "index"> = {
  "journal-ring": "journal",
};

// [修复 1] 使用 export default
export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const scheme = useColorScheme();
  const { tr } = useSettings();
  const { width: screenWidth } = Dimensions.get('window');

  const showBack = !!PARENT_TAB_OF[last];
  const isFocused = (name: string) => state.routes[state.index]?.name === name;
  const onIndexScreen = isFocused("index");
  const onJournalRing = last === "journal-ring";
  const onHome = isFocused("home");
  // const onGyms = isFocused("gyms"); // 胶囊风格通常保持一致，不需要特殊处理

  const colors = useMemo(() => {
    const isDark = scheme === "dark";
    return {
      // [关键] 背景色极淡，让 BlurView 发挥作用
      // 如果觉得不够模糊，可以把透明度再调低，例如 0.1
      shellBg: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.2)",
      
      shellBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)",
      
      // [修复 3] 明确定义激活颜色
      iconActive: "#306E6F", // 你的主题绿
      iconInactive: isDark ? "#94A3B8" : "#999999",
      
      primaryBg: "#306E6F",
      primaryText: "#FFFFFF",
      
      backBg: isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)",
      backIcon: isDark ? "#FFF" : "#111",
      
      isDark,
    };
  }, [scheme]);

  const [actionsOpen, setActionsOpen] = useState(false);
  const plusAnim = useRef(new Animated.Value(0)).current;
  const rotate = plusAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  const openActions = () => { setActionsOpen(true); Animated.spring(plusAnim, { toValue: 1, useNativeDriver: true }).start(); };
  const closeActions = () => { setActionsOpen(false); Animated.spring(plusAnim, { toValue: 0, useNativeDriver: true }).start(); };
  const toggleActions = () => (actionsOpen ? closeActions() : openActions());

  if (onIndexScreen) return null;

  // Back Button Logic (保持原样，只是样式微调)
  if (onJournalRing) {
    return (
      <View pointerEvents="box-none" style={[styles.root, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          onPress={() => {
            const parent = PARENT_TAB_OF[last];
            parent ? navigation.navigate(parent as never) : router.back?.();
          }}
          style={({ pressed }) => [
            styles.backButton,
            {
              backgroundColor: colors.backBg,
              opacity: pressed ? 0.85 : 1,
              left: 20, bottom: 0 
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.backIcon} />
        </Pressable>
      </View>
    );
  }

  const goRoute = (name: string) => {
    if (!state.routes.some((r) => r.name === name)) return;
    if (actionsOpen) closeActions();
    if (name === "profile") navigation.dispatch(TabActions.jumpTo(name, { resetProfile: true }));
    else navigation.dispatch(TabActions.jumpTo(name));
  };

  const actions: FloatingActionItem[] = [
    { key: "generator", label: tr("生成训练计划", "Generate plan"), icon: "flash-outline", onPress: () => goRoute("index") },
    { key: "quick-log", label: tr("快速记录", "Quick log"), icon: "create-outline", onPress: () => goRoute("journal") },
  ];

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {showBack && (
        <Pressable
          onPress={() => {
            const parent = PARENT_TAB_OF[last];
            parent ? navigation.navigate(parent as never) : router.back?.();
          }}
          style={({ pressed }) => [
            styles.backButton,
            {
              bottom: CAPSULE_HEIGHT + 20 + insets.bottom, // 放在 TabBar 上方
              backgroundColor: colors.backBg,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.backIcon} />
        </Pressable>
      )}

      {/* 🔹 悬浮胶囊容器 */}
      <View
        style={[
          styles.capsuleShadow,
          {
            bottom: insets.bottom, // 悬浮在底部上方
            left: (screenWidth - CAPSULE_WIDTH) / 2, // 水平居中
            width: CAPSULE_WIDTH,
            height: CAPSULE_HEIGHT,
          }
        ]}
      >
        {/* 🔹 毛玻璃背景 */}
        <BlurView
          intensity={80}
          tint={colors.isDark ? "dark" : "default"}
          style={[
            styles.blurView,
            {
              backgroundColor: colors.shellBg,
              borderColor: colors.shellBorder,
              borderWidth: 1, // 细边框增加质感
            }
          ]}
        >
          <View style={styles.tabItemsContainer}>
            {/* 左侧图标: Home, Calendar */}
            {["home", "calendar"].map((name) => {
              const icon = ICONS[name];
              const focused = isFocused(name);
              // [修复 2] 显式指定 Icon 类型
              let IconComp: any = Ionicons;
              if (name === 'calendar') IconComp = MaterialCommunityIcons;

              return (
                <Pressable
                  key={name}
                  onPress={() => goRoute(name)}
                  style={styles.iconButton}
                >
                  <IconComp 
                    name={focused ? icon.active : icon.inactive} 
                    size={26} 
                    color={focused ? colors.iconActive : colors.iconInactive} 
                  />
                </Pressable>
              );
            })}

            {/* 中间加号 (稍微突出一点或者在胶囊内) */}
            {/* IKON 风格通常是所有图标大小一致，这里我们保持你的加号特色但缩小一点适配胶囊 */}
            <Pressable
              onPress={toggleActions}
              style={styles.primaryButton}
            >
              <View style={[styles.primaryCircle, { backgroundColor: colors.primaryBg }]}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <Ionicons name={ICONS.index.active as any} size={24} color={colors.primaryText} />
                </Animated.View>
              </View>
            </Pressable>

            {/* 右侧图标: Analysis, Profile */}
            {["analysis", "profile"].map((name) => {
              const icon = ICONS[name];
              const focused = isFocused(name);
              let IconComp: any = Ionicons;

              return (
                <Pressable
                  key={name}
                  onPress={() => goRoute(name)}
                  style={styles.iconButton}
                >
                  <IconComp 
                    name={focused ? icon.active : icon.inactive} 
                    size={26} 
                    color={focused ? colors.iconActive : colors.iconInactive} 
                  />
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>

      <FloatingActionsSheet
        open={actionsOpen}
        // ActionSheet 需要从胶囊上方弹出
        bottomOffset={CAPSULE_HEIGHT + insets.bottom + 20}
        sideMargin={((Dimensions.get('window').width - CAPSULE_WIDTH) / 2)} // 对齐胶囊边缘
        onClose={closeActions}
        actions={actions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute", left: 0, right: 0, bottom: 0, top: 0,
    zIndex: 999, pointerEvents: "box-none",
  },
  backButton: {
    position: "absolute", left: 20, 
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  // 胶囊外层 (负责阴影)
  capsuleShadow: {
    position: 'absolute',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, // 阴影浓度
    shadowRadius: 12,    // 阴影扩散
    elevation: 8,
    borderRadius: 32, // 全圆角 (高度的一半)
  },
  // 胶囊内层 (负责模糊和裁切)
  blurView: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tabItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly', // 均匀分布图标
    height: '100%',
    paddingHorizontal: 2,
  },
  iconButton: {
    width: 44, 
    height: 44,
    alignItems: "center", 
    justifyContent: "center",
  },
  primaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,   
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCircle: {
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  }
});