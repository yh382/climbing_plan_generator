import React, { useEffect, useLayoutEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

// 上下文和组件
import { useSettings } from "src/contexts/SettingsContext";
import { Card } from "@components/ui/Card";
import { Segmented } from "@components/ui/Segmented";
import { useAuthStore } from "src/store/useAuthStore";

// 类型定义
type Lang = "zh" | "en";
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

const SCROLL_THRESHOLD = 44;

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);

  const {
    ready,
    lang,
    setLang,
    unit,
    setUnit,
    boulderScale,
    setBoulderScale,
    ropeScale,
    setRopeScale,
  } = useSettings();

  // 1) 隐藏底部 TabBar
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  // 2) 动画值 & 滚动监听
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // 顶部模糊背景渐入
  const headerBlurStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    };
  });

  // 顶部中间小标题渐入
  const headerTitleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10], [0, 1], Extrapolate.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [SCROLL_THRESHOLD - 10, SCROLL_THRESHOLD + 10], [10, 0], Extrapolate.CLAMP) },
      ],
    };
  });

  // 页面内左侧大标题渐隐
  const bigTitleStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
      transform: [
        { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.94], Extrapolate.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
      ],
    };
  });

  if (!ready) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={{ color: "#111" }}>{tr("加载设置中…", "Loading settings…")}</Text>
      </View>
    );
  }

  // --- 辅助组件：带箭头的导航行 ---
  const NavRow = ({
    label,
    route,
    last = false,
  }: {
    label: string;
    route?: string;
    last?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.row, styles.navRowHeight, last && styles.noBorder]}
      onPress={() => {
        if (route) router.push(route as any);
        else Alert.alert(tr("提示", "Notice"), tr("该功能暂未开放", "This feature is coming soon."));
      }}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  // --- 辅助组件：带胶囊切换的显示行 ---
  const DisplayRow = ({
    label,
    value,
    options,
    onChange,
    last = false,
  }: {
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (val: string) => void;
    last?: boolean;
  }) => (
    <View style={[styles.row, styles.displayRowHeight, last && styles.noBorder]}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ width: 153 }}>
        <Segmented value={value} onChange={onChange} options={options} />
      </View>
    </View>
  );

  // 小标题
  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <View style={styles.page}>
      {/* --- 1) Fixed Animated Header (like Home) --- */}
      <View style={[styles.fixedHeader, { height: insets.top + 44 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, headerBlurStyle]}>
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.headerBorder} />
        </Animated.View>

        <View style={[styles.headerContent, { marginTop: insets.top }]}>
          {/* 左侧返回键 */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.navigate("/profile");
            }}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={35} color="#111" />
          </TouchableOpacity>

          {/* 中间小标题（滚动后出现） */}
          <Animated.View style={[styles.headerTitleContainer, headerTitleStyle]}>
            <Text style={styles.headerTitleText}>{tr("设置", "Settings")}</Text>
          </Animated.View>

          {/* 右侧占位，保持中间标题居中 */}
          <View style={styles.iconBtn} />
        </View>
      </View>

      {/* --- 2) Scrollable Content --- */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 28, // ✅ 底部安全区 + 一点呼吸感
        }}
      >
        {/* 顶部大标题区域（左对齐 + 渐隐） */}
        <View style={styles.bigTitleRow}>
          <Animated.View style={[styles.bigTitleArea, bigTitleStyle]}>
            <Text style={styles.bigTitle}>{tr("设置", "Settings")}</Text>
            <Text style={styles.bigSubtitle}>
              {tr("偏好、显示与账户管理", "Preferences, display & account")}
            </Text>
          </Animated.View>
          <View style={{ width: 40 }} />
        </View>

        {/* 内容区 */}
        <View style={styles.contentWrap}>
          {/* Account */}
          <SectionTitle title={tr("账户", "Account")} />
          <Card style={styles.card}>
            <NavRow label={tr("通知", "Notifications")} route="/settings/notifications" />
            <NavRow label={tr("隐私", "Privacy")} route="/settings/privacy" />
            <NavRow label={tr("订阅计划", "Subscription Plan")} last />
          </Card>

          {/* Display */}
          <SectionTitle title={tr("显示", "Display")} />
          <Card style={styles.card}>
            <DisplayRow
              label={tr("抱石等级", "Boulder Grades")}
              value={boulderScale}
              onChange={(v) => setBoulderScale(v as BoulderScale)}
              options={[
                { label: "V", value: "V" },
                { label: "Font", value: "Font" },
              ]}
            />
            <DisplayRow
              label={tr("攀岩等级", "Route Grades")}
              value={ropeScale}
              onChange={(v) => setRopeScale(v as RopeScale)}
              options={[
                { label: "YDS", value: "YDS" },
                { label: "Fr.", value: "French" },
              ]}
            />
            <DisplayRow
              label={tr("单位", "Unit")}
              value={unit}
              onChange={(v) => setUnit(v as UnitSystem)}
              options={[
                { label: tr("公制", "Metric"), value: "metric" },
                { label: tr("英制", "Imperial"), value: "imperial" },
              ]}
            />
            <DisplayRow
              label={tr("语言", "Language")}
              value={lang}
              onChange={(v) => setLang(v as Lang)}
              options={[
                { label: "中文", value: "zh" },
                { label: "EN", value: "en" },
              ]}
              last
            />
          </Card>

          {/* Activity */}
          <SectionTitle title={tr("活动", "Activity")} />
          <Card style={styles.card}>
            <NavRow label={tr("收藏", "Saved")} route="/profile/saved" />
            <NavRow label={tr("已屏蔽", "Blocked")} route="/profile/blocked" />
            <NavRow label={tr("评论", "Comments")} route="/profile/comments" />
            <NavRow label={tr("提及", "Mentions")} route="/profile/mentions" />
            <NavRow label={tr("点赞", "Likes")} route="/profile/likes" last />
          </Card>

          {/* Misc */}
          <View style={{ height: 12 }} />
          <Card style={styles.card}>
            <NavRow label={tr("帮助", "Help")} route="/settings/help" />
            <NavRow label={tr("关于", "About")} route="/settings/about" last />
          </Card>

          {/* Logout */}
          <View style={{ height: 16 }} />
          <Card style={styles.card}>
            <TouchableOpacity
              style={[styles.row, styles.navRowHeight, styles.noBorder]}
              onPress={() => {
                Alert.alert(
                  tr("确认退出登录？", "Confirm logout?"),
                  tr("你需要重新登录才能继续使用。", "You will need to log in again."),
                  [
                    { text: tr("取消", "Cancel"), style: "cancel" },
                    {
                      text: tr("退出登录", "Logout"),
                      style: "destructive",
                      onPress: async () => {
                        await logout();
                        router.replace("/login");
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.label, { color: "#D92D20", fontWeight: "600" }]}>
                {tr("退出登录", "Logout")}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  // Header (Home-like)
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "none",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Big title area
  bigTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  bigTitleArea: {
    flex: 1,
    paddingTop: 35, // ✅ 控制大标题纵向位置（更靠下/靠上就调这里）
  },
  bigTitle: {
    fontSize: 32, // ✅ 控制字体大小
    fontWeight: "800", // ✅ 控制粗细
    color: "#111",
    lineHeight: 38, // ✅ 控制行高（影响视觉“垂直重心”）
  },
  bigSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  contentWrap: {
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 13,
    color: "#6D6D72",
    marginBottom: 6,
    marginLeft: 12,
    marginTop: 16,
  },

  card: {
    borderRadius: 14,
    padding: 0,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  navRowHeight: {
    paddingVertical: 16,
  },
  displayRowHeight: {
    paddingVertical: 11,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 16,
    color: "#111",
  },
});
