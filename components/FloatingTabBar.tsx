// src/components/FloatingTabBar.tsx
import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  useColorScheme,
  Dimensions,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSettings } from "../src/contexts/SettingsContext";
import { TabActions } from "@react-navigation/native";
import { BlurView } from "expo-blur";

const screenWidth = Dimensions.get("window").width;
const CAPSULE_WIDTH = Math.min(screenWidth - 40, 420);
const CAPSULE_HEIGHT = 60;

const ICONS: Record<string, { lib: "ion" | "mci"; active: any; inactive: any; label: string }> = {
  index: { lib: "ion", active: "home", inactive: "home-outline", label: "Home" },
  calendar: { lib: "mci", active: "calendar", inactive: "calendar-outline", label: "Session" },
  coach: { lib: "ion", active: "chatbubbles", inactive: "chatbubbles-outline", label: "Coach" },
  community: { lib: "ion", active: "people", inactive: "people-outline", label: "Community" },
  profile: { lib: "ion", active: "person", inactive: "person-outline", label: "Profile" },
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

  const onCoachScreen = isFocused("coach");
  const onSettingsScreen = last === "settings";
  const onJournalRing = last === "journal-ring";

  const colors = useMemo(() => {
    const isDark = scheme === "dark";
    return {
      shellBg: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.2)",
      shellBorder: isDark ? "rgba(255,255,255,0.15)" : "rgba(233, 232, 232, 0.15)",
      iconActive: "#306E6F",
      iconInactive: isDark ? "#94A3B8" : "#999999",
      backBg: isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)",
      backIcon: isDark ? "#FFF" : "#111",
      isDark,
    };
  }, [scheme]);

  // ✅ Chat 场景：隐藏 TabBar（避免底部输入框 + tabbar 双底栏）
  if (onCoachScreen || onSettingsScreen) return null;

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
              left: 20,
              bottom: 0,
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

    if (name === "profile") navigation.dispatch(TabActions.jumpTo(name, { resetProfile: true }));
    else navigation.dispatch(TabActions.jumpTo(name));
  };

  const renderIcon = (name: string) => {
    const icon = ICONS[name];
    const focused = isFocused(name);

    if (icon.lib === "mci") {
      return (
        <MaterialCommunityIcons
          name={focused ? icon.active : icon.inactive}
          size={26}
          color={focused ? colors.iconActive : colors.iconInactive}
        />
      );
    }

    return (
      <Ionicons
        name={focused ? icon.active : icon.inactive}
        size={26}
        color={focused ? colors.iconActive : colors.iconInactive}
      />
    );
  };

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
          },
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
            },
          ]}
        >
          <View style={styles.tabItemsContainer}>
            {(["index", "calendar", "coach", "community", "profile"] as const).map((name) => (
              <Pressable key={name} onPress={() => goRoute(name)} style={styles.iconButton}>
                {renderIcon(name)}
              </Pressable>
            ))}
          </View>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    zIndex: 999,
    pointerEvents: "box-none",
  },
  backButton: {
    position: "absolute",
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  capsuleShadow: {
    position: "absolute",
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
    overflow: "hidden",
    justifyContent: "center",
  },
  tabItemsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100%",
    paddingHorizontal: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
