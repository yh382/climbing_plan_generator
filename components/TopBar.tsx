// components/TopBar.tsx

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  Pressable,
  Platform,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../src/contexts/SettingsContext";
import TopRightControls, {
  TopRightControlsProps,
  TopRightMode,
} from "./TopRightControls";
import { Ionicons } from "@expo/vector-icons";
import { TabActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { useUserStore } from "@/store/useUserStore";
import GlassIconButton from "@components/GlassIconButton";

type Props = {
  routeName: string;
  title?: string;
  titleZH?: string;
  titleEN?: string;
  profileSettingsOpen?: boolean;
  leftControls?: {
    mode: "back" | "custom";
    onBack?: () => void;
  };
  rightControls?: TopRightControlsProps;
  rightAccessory?: React.ReactNode;
  leftAccessory?: React.ReactNode; 
  centerControl?: React.ReactNode;
  defaultStepper?: {
    step?: number;
    total?: number;
  };
  useSafeArea?: boolean;
};

export default function TopBar({
  routeName,
  title,
  titleZH,
  titleEN,
  profileSettingsOpen = false,
  leftControls,
  rightControls,
  rightAccessory,
  leftAccessory,
  centerControl,
  defaultStepper,
  useSafeArea = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { tr } = useSettings();
  const navigation = useNavigation();
  const router = useRouter();
  const { user } = useUserStore();

  const defaultMode: TopRightMode =
    routeName?.toLowerCase?.() === "index"
      ? "stepper"
      : ["calendar", "journal"].includes(routeName?.toLowerCase?.())
      ? "date"
      : "none";

  const resolvedRight = useMemo<TopRightControlsProps | undefined>(() => {
    if (rightControls) return rightControls;
    if (defaultMode === "none") return undefined;
    if (defaultMode === "stepper") {
      const step = defaultStepper?.step ?? 1;
      const total = defaultStepper?.total ?? 4;
      return { mode: "stepper", step, total };
    }
    return {
      mode: "date",
      dateLabel: tr("09/27 · 周六", "Sat, Sep 27"),
      weekCompact: "W3",
    };
  }, [rightControls, defaultMode, tr, defaultStepper]);

  const resolvedTitle =
    titleZH || titleEN
      ? tr(titleZH ?? (title ?? routeName), titleEN ?? (title ?? routeName))
      : tr(title ?? routeName, title ?? routeName);

  const isProfile = routeName?.toLowerCase?.() === "profile";

  const renderLeft = () => {
    if (leftAccessory) {
      return leftAccessory;
    }

    if (leftControls?.mode === "back") {
      return (
        <Pressable
          onPress={leftControls.onBack || (() => router.back())}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? "#F8FAFC" : "#111827"}
          />
        </Pressable>
      );
    }

    if (isProfile && profileSettingsOpen) {
      return (
        <Pressable
          accessibilityLabel={tr("返回个人资料", "Back to Profile")}
          onPress={() =>
            navigation.dispatch(
              TabActions.jumpTo("profile", { resetProfile: true })
            )
          }
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={isDark ? "#F8FAFC" : "#111827"}
          />
        </Pressable>
      );
    }
    return null;
  };

  const renderRight = () => {
    if (resolvedRight) return <TopRightControls {...resolvedRight} />;

    if (isProfile && !profileSettingsOpen) {
      return (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <GlassIconButton
            onPress={async () => {
              const username = (user as any)?.username || "user";
              const url = `https://climmate.app/u/${username}`;
              try {
                await Share.share(
                  Platform.select({
                    ios: { message: url },
                    android: {
                      title: tr("分享个人主页", "Share profile"),
                      message: url,
                    },
                    default: { message: url } as any,
                  })
                );
              } catch {}
            }}
            accessibilityLabel={tr("分享个人页面", "Share profile")}
          >
            <Ionicons
              name="share-outline"
              size={18}
              color={isDark ? "#F8FAFC" : "#111827"}
            />
          </GlassIconButton>

          <GlassIconButton
            onPress={() =>
              navigation.dispatch(
                TabActions.jumpTo("profile", { openSettings: true })
              )
            }
            accessibilityLabel={tr("打开设置", "Open settings")}
          >
            <Ionicons
              name="menu-outline"
              size={22}
              color={isDark ? "#F8FAFC" : "#111827"}
            />
          </GlassIconButton>
        </View>
      );
    }

    return rightAccessory ?? null;
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: useSafeArea ? insets.top : 0,
          // [核心修改] 浅色模式下改为纯白 "#FFFFFF"
          backgroundColor: isDark ? "#0B1220" : "#FFFFFF",
        },
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.leftContainer}>
          {renderLeft()}
        </View>

        <View style={styles.centerContainer}>
          {centerControl ? (
            centerControl
          ) : (
            <Text
              numberOfLines={1}
              style={[styles.title, { color: isDark ? "#F8FAFC" : "#111827" }]}
            >
              {resolvedTitle}
            </Text>
          )}
        </View>

        <View style={styles.rightContainer}>
          {renderRight()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  bar: {
    height: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  centerContainer: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center", 
  },
  rightContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: { fontSize: 18, fontWeight: "700" },
});