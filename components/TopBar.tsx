import React, { useMemo, ReactNode } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../app/contexts/SettingsContext";
import TopRightControls, { TopRightControlsProps, TopRightMode } from "./TopRightControls";

type Props = {
  routeName: string;
  /** 若提供则直接用；否则用 titleZH/titleEN 与 tr 同步语言；都不提供时回退 routeName */
  title?: string;
  /** 多语言标题优先于 title */
  titleZH?: string;
  titleEN?: string;
  leftAccessory?: ReactNode;
  /** 右侧模式与数据 */
  rightControls?: TopRightControlsProps;
  rightAccessory?: ReactNode;
  /** 默认步骤状态（仅当未传入 rightControls 且默认模式为 stepper 时生效） */
  defaultStepper?: {
    step?: number;
    total?: number;
  };
};

export default function TopBar({
  routeName,
  title,
  titleZH,
  titleEN,
  leftAccessory,
  rightControls,
  rightAccessory,
  defaultStepper,
}: Props) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { tr } = useSettings();

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
    return { mode: "date", dateLabel: tr("09/27 · 周六", "Sat, Sep 27"), weekCompact: "W3" };
  }, [rightControls, defaultMode, tr, defaultStepper?.step, defaultStepper?.total]);

    const resolvedTitle =
    (titleZH || titleEN)
        ? tr(titleZH ?? (title ?? routeName), titleEN ?? (title ?? routeName))
        : tr(title ?? routeName, title ?? routeName);

  const titleNode = leftAccessory ?? (
    <Text numberOfLines={1} style={[styles.title, { color: isDark ? "#F8FAFC" : "#111827" }]}>
      {resolvedTitle}
    </Text>
  );

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top, backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }]}
    >
      <View style={styles.bar}>
        <Text numberOfLines={1} style={[styles.title, { color: isDark ? "#F8FAFC" : "#111827" }]}>
          {resolvedTitle}
        </Text>
        {resolvedRight ? (
          <TopRightControls {...resolvedRight} />
        ) : (
          rightAccessory ?? <View style={{ width: 28 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  bar: {
    height: 48,                // 与右侧高度更一致
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "700", maxWidth: "55%" },
});
