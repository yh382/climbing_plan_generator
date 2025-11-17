// src/components/FloatingTabBar.tsx
import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  useColorScheme,
  Text,
} from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSettings } from "src/contexts/SettingsContext";
import { TabActions } from "@react-navigation/native";
import {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_GYMS_SIDE_MARGIN,
  FLOATING_TAB_BAR_ICON_BUTTON_SIZE,
  FLOATING_TAB_BAR_PRIMARY_HEIGHT,
  FLOATING_TAB_BAR_SIDE_MARGIN,
  FLOATING_TAB_BAR_VERTICAL_PADDING,
} from "./FloatingTabBar.constants";

// ⬇️ 新增：毛玻璃
import { BlurView } from "expo-blur";

export {
  FLOATING_TAB_BAR_BOTTOM_GAP,
  FLOATING_TAB_BAR_GYMS_SIDE_MARGIN,
  FLOATING_TAB_BAR_ICON_BUTTON_SIZE,
  FLOATING_TAB_BAR_PRIMARY_HEIGHT,
  FLOATING_TAB_BAR_SIDE_MARGIN,
  FLOATING_TAB_BAR_STACK_SPACING,
  FLOATING_TAB_BAR_TOTAL_HEIGHT,
  FLOATING_TAB_BAR_VERTICAL_PADDING,
} from "./FloatingTabBar.constants";

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap; label: string }
> = {
  index: { active: "create", inactive: "create-outline", label: "Generator" },
  calendar: { active: "calendar", inactive: "calendar-outline", label: "Calendar" },
  journal: { active: "document-text", inactive: "document-text-outline", label: "Journal" },
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
  const onIndexScreen = isFocused("index");
  const onJournalRing = last === "journal-ring";
  const onGyms = isFocused("gyms");

  const colors = useMemo(() => {
    const isDark = scheme === "dark";
    return {
      // ⬇️ 调整为更玻璃一点的透明度
      shellBg: isDark ? "rgba(15,23,42,0.40)" : "rgba(255,255,255,0.60)",
      shellBorder: isDark ? "rgba(148,163,184,0.85)" : "rgba(148,163,184,0.30)",
      primaryBg: "#306E6F",
      primaryActive: "#245556",
      primaryText: "#FFFFFF",
      iconActive: "#306E6F",
      iconInactive: "#94A3B8",
      iconBgActive: isDark ? "rgba(22,163,74,0.24)" : "rgba(22,163,74,0.16)",
      iconBg: "transparent",
      backBg: isDark ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.85)",
      backIcon: "#FFFFFF",
      shadow:
        Platform.OS === "ios"
          ? {
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
            }
          : {
              elevation: 12,
              shadowColor: "#000",
            },
      isDark,
    };
  }, [scheme]);

  if (onIndexScreen) {
    return null;
  }

  if (onJournalRing) {
    return (
      <View
        pointerEvents="box-none"
        style={[
          styles.root,
          { paddingBottom: (insets.bottom || 0) + FLOATING_TAB_BAR_BOTTOM_GAP },
        ]}
      >
        <Pressable
          accessibilityLabel="返回"
          onPress={() => {
            const parent = PARENT_TAB_OF[last];
            if (parent) {
              navigation.navigate(parent as never);
            } else {
              router.back?.();
            }
          }}
          style={({ pressed }) => [
            styles.backButton,
            {
              bottom: (insets.bottom || 0) + FLOATING_TAB_BAR_BOTTOM_GAP,
              backgroundColor: colors.backBg,
              opacity: pressed ? 0.85 : 1,
              left: "50%",
              marginLeft: -23,
              right: undefined,
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

    if (name === "profile") {
      navigation.dispatch(TabActions.jumpTo(name, { resetProfile: true }));
    } else {
      navigation.dispatch(TabActions.jumpTo(name));
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.root,
        { paddingBottom: (insets.bottom || 0) + FLOATING_TAB_BAR_BOTTOM_GAP },
              {
        shadowColor: "#FFFFFF",
        shadowOpacity: 0.20,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: -2 },
      },
      ]}
    >
      {showBack ? (
        <Pressable
          accessibilityLabel="返回"
          onPress={() => {
            const parent = PARENT_TAB_OF[last];
            if (parent) {
              navigation.navigate(parent as never);
            } else {
              router.back?.();
            }
          }}
          style={({ pressed }) => [
            styles.backButton,
            {
              bottom:
                (insets.bottom || 0) +
                FLOATING_TAB_BAR_BOTTOM_GAP +
                FLOATING_TAB_BAR_PRIMARY_HEIGHT +
                18,
              backgroundColor: colors.backBg,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.backIcon} />
        </Pressable>
      ) : null}

      {/* 🔹 毛玻璃 TabBar 壳体 */}
      <BlurView
        tint={colors.isDark ? "dark" : "light"}
        intensity={25}
        style={[
          styles.shell,
          {
            backgroundColor: colors.shellBg,
            borderColor: colors.shellBorder,
            marginHorizontal: onGyms
              ? FLOATING_TAB_BAR_GYMS_SIDE_MARGIN
              : FLOATING_TAB_BAR_SIDE_MARGIN,
            ...(colors.shadow || {}),
            borderTopLeftRadius: onGyms ? 0 : 24,
            borderTopRightRadius: onGyms ? 0 : 24,
            marginTop: onGyms ? -1 : 0, // ✅ gyms 页：保持原有特殊处理
            overflow: "hidden",
          },
        ]}
      >
        <Pressable
          accessibilityLabel={ICONS.index.label}
          onPress={() => goRoute("index")}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: isFocused("index")
                ? colors.primaryActive
                : colors.primaryBg,
              transform: [{ translateY: pressed ? 1 : 0 }],
              shadowColor: "#000",
              shadowOpacity: Platform.OS === "ios" ? 0.15 : 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: Platform.OS === "android" ? 6 : undefined,
            },
          ]}
        >
          <Ionicons
            name={
              isFocused("index") ? ICONS.index.active : ICONS.index.inactive
            }
            size={26}
            color={colors.primaryText}
          />
          <Text style={[styles.primaryLabel, { color: colors.primaryText }]}>
            {tr("生成器", "Generator")}
          </Text>
        </Pressable>

        {["calendar", "gyms", "journal", "profile"].map((name) => {
          const icon = ICONS[name];
          const focused = isFocused(name);
          return (
            <Pressable
              key={name}
              accessibilityLabel={icon.label}
              onPress={() => goRoute(name)}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  backgroundColor: focused
                    ? colors.iconBgActive
                    : colors.iconBg,
                  transform: [{ translateY: pressed ? 1 : 0 }],
                },
              ]}
            >
              <Ionicons
                name={focused ? icon.active : icon.inactive}
                size={22}
                color={focused ? colors.iconActive : colors.iconInactive}
              />
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  shell: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: FLOATING_TAB_BAR_VERTICAL_PADDING,
    borderRadius: 40,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    height: FLOATING_TAB_BAR_PRIMARY_HEIGHT,
    borderRadius: 40,
    gap: 10,
    flex: 1,
  },
  primaryLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "rgba(148,163,184,0.4)",
  },
  iconButton: {
    width: FLOATING_TAB_BAR_ICON_BUTTON_SIZE,
    height: FLOATING_TAB_BAR_ICON_BUTTON_SIZE,
    borderRadius: FLOATING_TAB_BAR_ICON_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
  },
  backButton: {
    position: "absolute",
    left: 30,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
