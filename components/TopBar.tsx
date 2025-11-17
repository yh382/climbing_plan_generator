// TopBar.tsx
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

// ⬇️ 新增：毛玻璃
import { BlurView } from "expo-blur";

// ⬇️ 仅用于 Profile 右上角按钮 & 返回
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, TabActions } from "@react-navigation/native";
import { useUserStore } from "@/store/useUserStore";
import GlassIconButton from "@components/GlassIconButton";

type Props = {
  routeName: string;
  title?: string;
  titleZH?: string;
  titleEN?: string;
  // 只新增这个布尔值，不改其余 props
  profileSettingsOpen?: boolean;
  rightControls?: TopRightControlsProps;
  rightAccessory?: React.ReactNode;
  defaultStepper?: {
    step?: number;
    total?: number;
  };
};

// 小胶囊按钮：里面放图标，外面一层 BlurView
type GlassIconButtonProps = {
  isDark: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  children: React.ReactNode;
};

export default function TopBar({
  routeName,
  title,
  titleZH,
  titleEN,
  profileSettingsOpen = false,
  rightControls,
  rightAccessory,
  defaultStepper,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { tr } = useSettings();

  // 仅在本文件内使用，不影响外部
  const navigation = useNavigation();
  const { user } = useUserStore();

  // —— 保持 TopRightControls 的原有逻辑不变 —— //
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
  }, [rightControls, defaultMode, tr, defaultStepper?.step, defaultStepper?.total]);

  const resolvedTitle =
    titleZH || titleEN
      ? tr(titleZH ?? (title ?? routeName), titleEN ?? (title ?? routeName))
      : tr(title ?? routeName, title ?? routeName);

  const isProfile = routeName?.toLowerCase?.() === "profile";

  // 左侧：settings 打开时显示返回箭头
  const renderLeft = () =>
    isProfile && profileSettingsOpen ? (
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
    ) : null;

  // 右侧：优先 TopRightControls；否则在 Profile&未开设置时给出 分享+三条杠（毛玻璃胶囊）；否则回退到外部传入的 rightAccessory
  const renderRight = () => {
  if (resolvedRight) return <TopRightControls {...resolvedRight} />;

  if (isProfile && !profileSettingsOpen) {
    return (
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* 分享 */}
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

        {/* 设置（三条杠） */}
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
          paddingTop: insets.top,
          backgroundColor: isDark ? "#0B1220" : "#fafafaff",
        },
      ]}
    >
      <View style={styles.bar}>
        {/* 左侧（仅在 Profile 且 settings 开启时） */}
        {renderLeft()}

        {/* 标题 —— 保持你的原始布局，不强制居中 */}
        <Text
          numberOfLines={1}
          style={[styles.title, { color: isDark ? "#F8FAFC" : "#111827" }]}
        >
          {resolvedTitle}
        </Text>

        {/* 右侧：TopRightControls > Profile 的分享/设置 > 外部 rightAccessory */}
        {renderRight()}
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
  title: { fontSize: 18, fontWeight: "700" },
});
