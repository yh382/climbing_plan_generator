import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View, LayoutChangeEvent, Image, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView } from "expo-glass-effect";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { TabActions } from "@react-navigation/native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  useAnimatedReaction,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import CoachDockComposer from "./CoachDockComposer";
import { useSettings } from "../../contexts/SettingsContext";
// ✅ 抽出来的悬浮计时器（只管显示&定位）
import FloatingActiveSessionTimer from "../../features/journal/FloatingActiveSessionTimer";

const { width: SCREEN_W } = Dimensions.get("window");

// layout
const H = 60;
const BTN = 72;

// ✅ 两端锚定 inset
const INSET_L = 10;
const INSET_R = 10;

// ✅ 两胶囊之间的间距
const GAP = 12;

// ✅ 左胶囊最小宽度
const LEFT_MIN_W = BTN;

// ✅ highlight 默认宽度
const FALLBACK_HI_W = 56;

// ✅ 最大灰底宽度
const MAX_HI_W = BTN + 34;

type BaseTabName = "index" | "calendar" | "community" | "profile";
type TabName = BaseTabName | "coach";

const ICONS: Record<string, { lib: "ion" | "mci"; active: any; inactive: any }> = {
  index: { lib: "ion", active: "home", inactive: "home-outline" },
  calendar: { lib: "mci", active: "calendar", inactive: "calendar-outline" },
  community: { lib: "ion", active: "people", inactive: "people-outline" },
  profile: { lib: "ion", active: "person", inactive: "person-outline" },
  coach: { lib: "ion", active: "chatbubbles", inactive: "chatbubbles-outline" },
};

const TAB_INDEX: Record<BaseTabName, number> = {
  index: 0,
  calendar: 1,
  community: 2,
  profile: 3,
};

const TABBAR_SPRING = {
  damping: 16,
  stiffness: 120,
  mass: 1.2,
  overshootClamping: true,
  restDisplacementThreshold: 0.2,
  restSpeedThreshold: 0.2,
} as const;

const PILL_SPRING = {
  damping: 25,
  stiffness: 300,
  mass: 0.85,
  overshootClamping: false,
  restDisplacementThreshold: 0.2,
  restSpeedThreshold: 0.2,
} as const;

export default function SplitFloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { tr } = useSettings();
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;
  const style = focusedOptions?.tabBarStyle as any;

  const shouldHide = style?.display === "none";
  const current = state.routes[state.index]?.name as TabName | undefined;
  const onCoach = current === "coach";

  const lastNonCoachRef = useRef<BaseTabName>("index");
  useEffect(() => {
    if (!current || current === "coach") return;
    if (current === "index" || current === "calendar" || current === "community" || current === "profile") {
      lastNonCoachRef.current = current;
    }
  }, [current]);

  const t = useSharedValue(onCoach ? 1 : 0);
  useEffect(() => {
    t.value = withSpring(onCoach ? 1 : 0, TABBAR_SPRING);
  }, [onCoach, t]);

  const colors = useMemo(
    () => ({
      shellBg: "rgba(255,255,255,0.10)",
      shellBorder: "rgba(15,23,42,0.10)",
      iconActive: "#306E6F",
      iconInactive: "#111827",
      labelActive: "#306E6F",
      labelInactive: "#6B7280",
      highlightBg: "rgba(15,23,42,0.08)",
      highlightBorder: "rgba(15,23,42,0.08)",
    }),
    []
  );

  const goRoute = (name: string) => {
    if (!state.routes.some((r) => r.name === name)) return;
    navigation.dispatch(TabActions.jumpTo(name));
  };

  const labelText = (name: BaseTabName) => {
    switch (name) {
      case "index":
        return tr("主页", "Home");
      case "calendar":
        return tr("日历", "Calendar");
      case "community":
        return tr("社区", "Cmty");
      case "profile":
        return tr("个人", "Profile");
    }
  };

  const iconNode = (name: TabName, focused: boolean) => {
    const spec = ICONS[name];
    const color = focused ? colors.iconActive : colors.iconInactive;
    if (spec.lib === "mci") {
      return <MaterialCommunityIcons name={focused ? spec.active : spec.inactive} size={24} color={color} />;
    }
    return <Ionicons name={focused ? spec.active : spec.inactive} size={24} color={color} />;
  };

  const rightExpandedW = Math.min(SCREEN_W - INSET_L - INSET_R - LEFT_MIN_W - GAP, 360);
  const rightW = useDerivedValue(() => interpolate(t.value, [0, 1], [BTN, rightExpandedW], Extrapolate.CLAMP));
  const leftW = useDerivedValue(() => {
    const target = SCREEN_W - INSET_L - INSET_R - rightW.value - GAP;
    return Math.max(LEFT_MIN_W, target);
  });

  const leftStyle = useAnimatedStyle(() => ({ width: leftW.value }));
  const rightStyle = useAnimatedStyle(() => ({ width: rightW.value }));

  const tab0Style = useAnimatedStyle(() => ({ transform: [{ translateX: 0 }, { scale: 1 }], opacity: 1 }));
  const tab1Style = useAnimatedStyle(() => {
    const tx = interpolate(t.value, [0, 1], [0, -1 * BTN], Extrapolate.CLAMP);
    const opacity = interpolate(t.value, [0, 0.7, 1], [1, 0, 0], Extrapolate.CLAMP);
    const scale = interpolate(t.value, [0, 0.55, 1], [1, 0.88, 0.94], Extrapolate.CLAMP);
    return { transform: [{ translateX: tx }, { scale }], opacity };
  });
  const tab2Style = useAnimatedStyle(() => {
    const tx = interpolate(t.value, [0, 1], [0, -2 * BTN], Extrapolate.CLAMP);
    const opacity = interpolate(t.value, [0, 0.7, 1], [1, 0, 0], Extrapolate.CLAMP);
    const scale = interpolate(t.value, [0, 0.55, 1], [1, 0.88, 0.94], Extrapolate.CLAMP);
    return { transform: [{ translateX: tx }, { scale }], opacity };
  });
  const tab3Style = useAnimatedStyle(() => {
    const tx = interpolate(t.value, [0, 1], [0, -3 * BTN], Extrapolate.CLAMP);
    const opacity = interpolate(t.value, [0, 0.7, 1], [1, 0, 0], Extrapolate.CLAMP);
    const scale = interpolate(t.value, [0, 0.55, 1], [1, 0.88, 0.94], Extrapolate.CLAMP);
    return { transform: [{ translateX: tx }, { scale }], opacity };
  });

  const overlayOpacity = useAnimatedStyle(() => {
    const o = interpolate(t.value, [0.35, 1], [0, 1], Extrapolate.CLAMP);
    return { opacity: o };
  });

  const baseHomeOpacity = useAnimatedStyle(() => {
    const o = interpolate(t.value, [0, 0.4], [1, 0], Extrapolate.CLAMP);
    return { opacity: o };
  });

  const activeIdx = useSharedValue(0);
  useEffect(() => {
    if (!current || current === "coach") return;
    const idx = TAB_INDEX[current as BaseTabName] ?? 0;
    activeIdx.value = idx;
  }, [current, activeIdx]);

  const contentW0 = useSharedValue(0);
  const contentW1 = useSharedValue(0);
  const contentW2 = useSharedValue(0);
  const contentW3 = useSharedValue(0);

  const onContentLayout = useCallback((idx: number, e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (idx === 0) contentW0.value = width;
    else if (idx === 1) contentW1.value = width;
    else if (idx === 2) contentW2.value = width;
    else contentW3.value = width;
  }, []);

  const rowW = useSharedValue(0);
  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    rowW.value = e.nativeEvent.layout.width;
  }, []);

  const hiX = useSharedValue((BTN - FALLBACK_HI_W) / 2);
  const hiW = useSharedValue(FALLBACK_HI_W);
  const hiO = useSharedValue(0.95);

  useAnimatedReaction(
    () => ({
      coach: t.value > 0.5,
      idx: activeIdx.value,
      leftW: leftW.value,
      rowW: rowW.value,
      w0: contentW0.value,
      w1: contentW1.value,
      w2: contentW2.value,
      w3: contentW3.value,
    }),
    (s) => {
      if (s.coach) {
        hiO.value = withTiming(0, { duration: 120 });
        return;
      }

      const usableW = s.rowW > 10 ? s.rowW : s.leftW;
      const n = 4;
      const space = (usableW - n * BTN) / (n + 1);
      const wrapX = space + s.idx * (BTN + space);

      const EXTRA_NON_CAL_W = 8;
      const nonCalendarMax = Math.max(
        s.w0 > 10 ? s.w0 : 0,
        s.w2 > 10 ? s.w2 : 0,
        s.w3 > 10 ? s.w3 : 0
      );

      const baseW = (nonCalendarMax > 10 ? nonCalendarMax : FALLBACK_HI_W) + EXTRA_NON_CAL_W;
      const calendarW = s.w1 > 10 ? s.w1 : FALLBACK_HI_W;

      let finalW = s.idx === 1 ? calendarW : baseW;
      finalW = Math.min(MAX_HI_W, Math.max(FALLBACK_HI_W, finalW));

      const finalX = wrapX + (BTN - finalW) / 2;

      hiO.value = withTiming(1, { duration: 80 });
      hiW.value = withSpring(finalW, PILL_SPRING);
      hiX.value = withSpring(finalX, PILL_SPRING);
    }
  );

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: hiO.value,
    transform: [{ translateX: hiX.value }],
    width: hiW.value,
  }));

  const LeftTabButton = ({ name, focused, disabled, onPress, measureIdx, showLabel = true }: any) => {
    const labelColor = focused ? colors.labelActive : colors.labelInactive;
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.iconButton, { opacity: pressed && !disabled ? 0.85 : 1 }]}
      >
        <View onLayout={measureIdx === undefined ? undefined : (e) => onContentLayout(measureIdx, e)} style={styles.contentBox}>
          {iconNode(name, focused)}
          {showLabel && (
            <Text style={[styles.label, { color: labelColor, opacity: disabled ? 0 : 1 }]} numberOfLines={1}>
              {labelText(name)}
            </Text>
          )}
        </View>
      </Pressable>
    );
  };

  const CoachIconButton = ({ onPress }: { onPress: () => void }) => {
    const focused = current === "coach";

    return (
      <Pressable onPress={onPress} style={styles.iconButton} accessibilityLabel="Coach">
        <Image
          source={require("../../../assets/images/icon_final3x.png")}
          style={[styles.coachIcon, { opacity: focused ? 1 : 0.85 }]}
          resizeMode="contain"
        />
      </Pressable>
    );
  };

  const onSend = (text: string) => {
    navigation.emit({ type: "coachSend" as any, target: "coach" as any, data: { text } as any });
  };

  const collapsedTab = lastNonCoachRef.current;

  if (shouldHide) return null;

  // ✅ 材质层：iOS 用 Liquid Glass，其他平台保留 BlurView（稳定 fallback）
  const ShellSurface = ({ children }: { children: React.ReactNode }) => {
    if (Platform.OS === "ios") {
      return (
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.shell,
            {
              // 玻璃本身就有材质，但边框保留你现在的视觉语言
              borderColor: colors.shellBorder,
            },
          ]}
        >
          {children}
        </GlassView>
      );
    }

    return (
      <BlurView
        intensity={80}
        tint="light"
        style={[styles.shell, { backgroundColor: colors.shellBg, borderColor: colors.shellBorder }]}
      >
        {children}
      </BlurView>
    );
  };

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {/* ✅ 悬浮计时器：全屏坐标系定位（避免被 anchorLayer 裁剪出屏） */}
      <FloatingActiveSessionTimer currentRouteName={current} tabBarHeight={H} offset={15} rightInset={INSET_R} />

      {/* ✅ 两端锚定层：只负责 TabBar 胶囊 */}
      <View pointerEvents="box-none" style={[styles.anchorLayer, { bottom: insets.bottom, left: INSET_L, right: INSET_R }]}>
        {/* Left capsule */}
        <Animated.View style={[styles.shellShadow, styles.leftAnchor, leftStyle]}>
          <ShellSurface>
            <View style={styles.tabsRow} onLayout={onRowLayout}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.highlightPill,
                  { backgroundColor: colors.highlightBg, borderColor: colors.highlightBorder },
                  highlightStyle,
                ]}
              />

              <Animated.View style={[tab0Style, baseHomeOpacity]} pointerEvents={onCoach ? "none" : "auto"}>
                <LeftTabButton
                  name="index"
                  focused={(current ?? "index") === "index"}
                  disabled={false}
                  onPress={() => goRoute("index")}
                  measureIdx={0}
                />
              </Animated.View>

              <Animated.View style={tab1Style} pointerEvents={onCoach ? "none" : "auto"}>
                <LeftTabButton
                  name="calendar"
                  focused={current === "calendar"}
                  disabled={onCoach}
                  onPress={() => goRoute("calendar")}
                  measureIdx={1}
                />
              </Animated.View>

              <Animated.View style={tab2Style} pointerEvents={onCoach ? "none" : "auto"}>
                <LeftTabButton
                  name="community"
                  focused={current === "community"}
                  disabled={onCoach}
                  onPress={() => goRoute("community")}
                  measureIdx={2}
                />
              </Animated.View>

              <Animated.View style={tab3Style} pointerEvents={onCoach ? "none" : "auto"}>
                <LeftTabButton
                  name="profile"
                  focused={current === "profile"}
                  disabled={onCoach}
                  onPress={() => goRoute("profile")}
                  measureIdx={3}
                />
              </Animated.View>

              <Animated.View pointerEvents={onCoach ? "auto" : "none"} style={[styles.leftOverlay, overlayOpacity]}>
                <LeftTabButton
                  name={collapsedTab}
                  focused={true}
                  disabled={false}
                  onPress={() => goRoute(collapsedTab)}
                  showLabel={false}
                />
              </Animated.View>
            </View>
          </ShellSurface>
        </Animated.View>

        {/* Right capsule */}
        <Animated.View style={[styles.shellShadow, styles.rightAnchor, rightStyle]}>
          <ShellSurface>
            {!onCoach ? (
              <CoachIconButton onPress={() => goRoute("coach")} />
            ) : (
              <View style={{ paddingHorizontal: 2 }}>
                <CoachDockComposer expanded={true} onSend={onSend} />
              </View>
            )}
          </ShellSurface>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
    pointerEvents: "box-none",
  },
  anchorLayer: {
    position: "absolute",
    height: H,
    pointerEvents: "box-none",
  },
  leftAnchor: {
    position: "absolute",
    left: 0,
    top: 0,
    height: H,
  },
  rightAnchor: {
    position: "absolute",
    right: 0,
    top: 0,
    height: H,
  },
  shellShadow: {
    borderRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    overflow: "hidden",
  },
  shell: {
    flex: 1,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 0.4,
    justifyContent: "center",
  },
  tabsRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: "100%",
    width: "100%",
  },
  iconButton: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  contentBox: {
    paddingHorizontal: 12,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  highlightPill: {
    position: "absolute",
    left: 0,
    top: "50%",
    marginTop: -25,
    height: 50,
    borderRadius: 25,
  },
  leftOverlay: {
    position: "absolute",
    left: 0,
    top: (H - BTN) / 2,
    width: BTN,
    height: BTN,
    alignItems: "center",
    justifyContent: "center",
  },
  coachIcon: {
    width: 34,
    height: 34,
  },
});
