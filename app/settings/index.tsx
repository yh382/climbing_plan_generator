import React, { useMemo, useLayoutEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// 上下文和组件
import { useSettings } from "src/contexts/SettingsContext";
import { Card } from "@components/ui/Card";
import { Segmented } from "@components/ui/Segmented";
import { useAuthStore } from "src/store/useAuthStore";
import { theme } from "src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { NATIVE_HEADER_LARGE } from "../../src/lib/nativeHeaderOptions";

// 类型定义
type Lang = "zh" | "en";
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  contentWrap: {
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 12,
    marginTop: 16,
  },

  card: {
    borderRadius: 14,
    padding: 0,
    overflow: "hidden",
    backgroundColor: colors.background,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: colors.background,
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
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
  },
});

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      headerShown: true,
      title: tr("设置", "Settings"),
    });
  }, [navigation, tr]);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
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
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="chevron.left"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <ScrollView
        style={styles.page}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View style={styles.contentWrap}>
          {/* Account */}
          <SectionTitle title={tr("账户", "Account")} />
          <Card style={styles.card}>
            <NavRow label={tr("通知", "Notifications")} route="/settings/notifications" />
            <NavRow label={tr("隐私", "Privacy")} route="/settings/privacy" />
            <NavRow label={tr("修改密码", "Change Password")} route="/change-password" />
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
      </ScrollView>
    </>
  );
}
