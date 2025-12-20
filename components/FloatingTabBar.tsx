// src/components/FloatingTabBar.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  useColorScheme,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSettings } from "src/contexts/SettingsContext";
import { TabActions } from "@react-navigation/native";
import { BlurView } from "expo-blur"; 

import FloatingActionsSheet, {
  FloatingActionItem,
} from "./FloatingActionsSheet";

const screenWidth = Dimensions.get('window').width;
const CAPSULE_WIDTH = Math.min(screenWidth - 40, 420);
const CAPSULE_HEIGHT = 60; 

// [修改 1] 更新图标映射：index 现在是 Home，plan_generator 是 Generator
const ICONS: Record<string, { active: any; inactive: any; label: string }> = {
  index: { active: "home", inactive: "home-outline", label: "Home" }, // Home
  plan_generator: { active: "add", inactive: "add", label: "Generator" }, // Generator
  calendar: { active: "calendar", inactive: "calendar-outline", label: "Session" },
  community: { active: "people", inactive: "people-outline", label: "Community" },
  profile: { active: "person", inactive: "person-outline", label: "Profile" },
  gyms: { active: "map", inactive: "map-outline", label: "Gyms" },
};

const PARENT_TAB_OF: Record<string, "calendar" | "journal" | "profile" | "index"> = {
  "journal-ring": "journal",
};

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const last = segments[segments.length - 1];
  const scheme = useColorScheme();
  const { tr } = useSettings();

  const showBack = !!PARENT_TAB_OF[last];
  const isFocused = (name: string) => state.routes[state.index]?.name === name;
  
  // [修改 2] 隐藏逻辑：在 plan_generator (生成器) 页面隐藏 TabBar，在 index (Home) 显示
  const onGeneratorScreen = isFocused("plan_generator");
  const onJournalRing = last === "journal-ring";

  const colors = useMemo(() => {
    const isDark = scheme === "dark";
    return {
      shellBg: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.2)",
      shellBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)",
      iconActive: "#306E6F",
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

  // [修改 2] 如果是生成器页面，完全隐藏 TabBar
  if (onGeneratorScreen) return null;

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
    { 
        key: "generator", 
        label: tr("生成训练计划", "Generate plan"), 
        icon: "flash-outline", 
        // [修改 3] 跳转到 plan_generator
        onPress: () => goRoute("plan_generator") 
    },
    { 
        key: "quick-log", 
        label: tr("快速记录", "Quick log"), 
        icon: "create-outline", 
        onPress: () => goRoute("journal") 
    },
    { 
        key: "create-post", 
        label: tr("发布动态", "Share Post"), 
        icon: "images-outline", 
        onPress: () => {
            closeActions();
            router.push("/community/create");
        }
    },
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
              bottom: CAPSULE_HEIGHT + 20 + insets.bottom, 
              backgroundColor: colors.backBg,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.backIcon} />
        </Pressable>
      )}

      <View
        style={[
          styles.capsuleShadow,
          {
            bottom: insets.bottom, 
            left: (screenWidth - CAPSULE_WIDTH) / 2, 
            width: CAPSULE_WIDTH,
            height: CAPSULE_HEIGHT,
          }
        ]}
      >
        <BlurView
          intensity={80}
          tint={colors.isDark ? "dark" : "default"}
          style={[
            styles.blurView,
            {
              backgroundColor: colors.shellBg,
              borderColor: colors.shellBorder,
              borderWidth: 1,
            }
          ]}
        >
          <View style={styles.tabItemsContainer}>
            {/* [修改 4] 左侧按钮组：将 'home' 改为 'index' */}
            {["index", "calendar"].map((name) => {
              const icon = ICONS[name];
              const focused = isFocused(name);
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

            {/* 中间加号 (呼出菜单) */}
            <Pressable
              onPress={toggleActions}
              style={styles.primaryButton}
            >
              <View style={[styles.primaryCircle, { backgroundColor: colors.primaryBg }]}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  {/* 使用 plan_generator 的图标（通常是 + 号） */}
                  <Ionicons name={ICONS.plan_generator.active as any} size={24} color={colors.primaryText} />
                </Animated.View>
              </View>
            </Pressable>

            {/* 右侧 Community & Profile */}
            {["community", "profile"].map((name) => {
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
        bottomOffset={CAPSULE_HEIGHT + insets.bottom + 20}
        sideMargin={((Dimensions.get('window').width - CAPSULE_WIDTH) / 2)}
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
  capsuleShadow: {
    position: 'absolute',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 32,
  },
  blurView: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tabItemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly', 
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