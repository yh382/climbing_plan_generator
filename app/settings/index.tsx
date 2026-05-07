import React, { useLayoutEffect } from "react";
import { Alert, Linking, Platform, useColorScheme } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { Host, Form, Section, Picker, Text, LabeledContent, Label, ZStack, Image } from "@expo/ui/swift-ui";
import { pickerStyle, tag, frame, background, shapes, font, foregroundStyle, scrollContentBackground } from "@expo/ui/swift-ui/modifiers";

import { useSettings } from "src/contexts/SettingsContext";
import { useAuthStore } from "src/store/useAuthStore";
import { useThemeColors } from "src/lib/useThemeColors";
import {
  HEADER_TRANSPARENT,
  NATIVE_HEADER_LARGE,
  withHeaderTheme,
} from "../../src/lib/nativeHeaderOptions";
import { SettingsRow } from "./_components/SettingsRow";

// 类型定义
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

// iOS Settings 风格图标：彩色圆角方块 + 白色 SF Symbol
// `name` is typed to the exact SF Symbol union the Image component expects,
// so TypeScript catches typos at compile time instead of silently falling
// through as `string`.
type SFSymbolName = NonNullable<React.ComponentProps<typeof Image>["systemName"]>;

const SettingIcon = ({ name, bg }: { name: SFSymbolName; bg: string }) => (
  <ZStack
    alignment="center"
    modifiers={[
      frame({ width: 28, height: 28 }),
      background(bg, shapes.roundedRectangle({ cornerRadius: 6 })),
    ]}
  >
    <Image systemName={name} size={16} color="#FFFFFF" />
  </ZStack>
);

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const isDark = useColorScheme() === "dark";
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);

  const {
    ready,
    lang,
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
      ...withHeaderTheme(colors),
      // Force inline title — Form's scroll view is hidden from
      // NativeStack so the large-title collapse can't fire. See
      // settings/_layout.tsx for full rationale.
      headerLargeTitle: false,
      headerShown: true,
      // Restore Liquid Glass / soft fade — COMPAT regression dropped
      // these earlier and left a hard divider on iOS 26 (mirror of
      // app/inbox/_layout.tsx).
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: tr("设置", "Settings"),
    });
  }, [navigation, tr, colors]);

  if (!ready) return null;

  const handleLogout = () => {
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
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      tr("删除账号", "Delete Account"),
      tr(
        "此操作不可撤销，你的所有数据（训练记录、帖子、消息等）将被永久删除。确定要继续吗？",
        "This action cannot be undone. All your data (training logs, posts, messages, etc.) will be permanently deleted. Are you sure?"
      ),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("永久删除", "Delete Forever"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              tr("最终确认", "Final Confirmation"),
              tr("请再次确认：删除后无法恢复。", "Please confirm again: this cannot be reversed."),
              [
                { text: tr("取消", "Cancel"), style: "cancel" },
                {
                  text: tr("确认删除", "Confirm Delete"),
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace("/login");
                    } catch {
                      Alert.alert(
                        tr("错误", "Error"),
                        tr("删除失败，请稍后重试。", "Failed to delete account. Please try again later.")
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="chevron.left"
          onPress={() => router.back()}
        />
      </Stack.Toolbar>
      <Host style={{ flex: 1 }} useViewportSizeMeasurement>
        <Form modifiers={[scrollContentBackground("hidden"), background(isDark ? colors.background : colors.backgroundSecondary)]}>
          {/* Account */}
          <Section title={tr("账户", "Account")}>
            <SettingsRow
              icon="bell.fill"
              iconBg="#FF9500"
              label={tr("通知", "Notifications")}
              onPress={() => router.push("/settings/notifications" as any)}
            />
            <SettingsRow
              icon="hand.raised.fill"
              iconBg="#5856D6"
              label={tr("隐私", "Privacy")}
              onPress={() => router.push("/settings/privacy" as any)}
            />
            <SettingsRow
              icon="key.fill"
              iconBg="#8E8E93"
              label={tr("修改密码", "Change Password")}
              onPress={() => router.push("/change-password" as any)}
            />
            <SettingsRow
              icon="crown.fill"
              iconBg="#FFD60A"
              label={tr("订阅计划", "Subscription Plan")}
              onPress={() =>
                Alert.alert(
                  tr("提示", "Notice"),
                  tr("该功能暂未开放", "This feature is coming soon."),
                )
              }
            />
          </Section>

          {/* Display */}
          <Section title={tr("显示", "Display")}>
            <LabeledContent label={
              <Label title={tr("抱石等级", "Boulder Grades")} icon={
                <ZStack alignment="center" modifiers={[frame({ width: 28, height: 28 }), background("#306E6F", shapes.roundedRectangle({ cornerRadius: 6 }))]}>
                  <Text modifiers={[foregroundStyle("#FFFFFF"), font({ size: 12, weight: "bold" })]}>V1</Text>
                </ZStack>
              } />
            }>
              <Picker
                selection={boulderScale}
                onSelectionChange={(v) => setBoulderScale(v as BoulderScale)}
                modifiers={[pickerStyle("segmented"), frame({ width: 140 })]}
              >
                <Text modifiers={[tag("V")]}>V</Text>
                <Text modifiers={[tag("Font")]}>Font</Text>
              </Picker>
            </LabeledContent>
            <LabeledContent label={
              <Label title={tr("攀岩等级", "Route Grades")} icon={
                <ZStack alignment="center" modifiers={[frame({ width: 28, height: 28 }), background("#306E6F", shapes.roundedRectangle({ cornerRadius: 6 }))]}>
                  <Text modifiers={[foregroundStyle("#FFFFFF"), font({ size: 12, weight: "bold" })]}>5.6</Text>
                </ZStack>
              } />
            }>
              <Picker
                selection={ropeScale}
                onSelectionChange={(v) => setRopeScale(v as RopeScale)}
                modifiers={[pickerStyle("segmented"), frame({ width: 140 })]}
              >
                <Text modifiers={[tag("YDS")]}>YDS</Text>
                <Text modifiers={[tag("French")]}>Fr.</Text>
              </Picker>
            </LabeledContent>
            <LabeledContent label={
              <Label title={tr("单位", "Unit")} icon={<SettingIcon name="ruler" bg="#306E6F" />} />
            }>
              <Picker
                selection={unit}
                onSelectionChange={(v) => setUnit(v as UnitSystem)}
                modifiers={[pickerStyle("segmented"), frame({ width: 140 })]}
              >
                <Text modifiers={[tag("metric")]}>{tr("公制", "Metric")}</Text>
                <Text modifiers={[tag("imperial")]}>{tr("英制", "Imperial")}</Text>
              </Picker>
            </LabeledContent>
          </Section>

          {/* Activity */}
          <Section title={tr("活动", "Activity")}>
            <SettingsRow
              icon="bookmark.fill"
              iconBg="#007AFF"
              label={tr("收藏", "Saved")}
              onPress={() => router.push("/profile/saved" as any)}
            />
            <SettingsRow
              icon="slash.circle.fill"
              iconBg="#FF3B30"
              label={tr("已屏蔽", "Blocked")}
              onPress={() => router.push("/profile/blocked" as any)}
            />
            <SettingsRow
              icon="bubble.left.fill"
              iconBg="#34C759"
              label={tr("评论", "Comments")}
              onPress={() => router.push("/profile/comments" as any)}
            />
            <SettingsRow
              icon="at"
              iconBg="#5856D6"
              label={tr("提及", "Mentions")}
              onPress={() => router.push("/profile/mentions" as any)}
            />
            <SettingsRow
              icon="heart.fill"
              iconBg="#FF2D55"
              label={tr("点赞", "Likes")}
              onPress={() => router.push("/profile/likes" as any)}
            />
          </Section>

          {/* Misc */}
          <Section>
            <SettingsRow
              icon="questionmark.circle.fill"
              iconBg="#8E8E93"
              label={tr("帮助", "Help")}
              onPress={() => router.push("/settings/help" as any)}
            />
          </Section>

          {/* Legal */}
          <Section title={tr("法律", "Legal")}>
            <SettingsRow
              icon="doc.text.fill"
              iconBg="#8E8E93"
              label={tr("隐私政策", "Privacy Policy")}
              onPress={() =>
                Linking.openURL("https://yh382.github.io/climmate-legal/privacy")
              }
            />
            <SettingsRow
              icon="doc.plaintext.fill"
              iconBg="#8E8E93"
              label={tr("使用条款", "Terms of Service")}
              onPress={() =>
                Linking.openURL("https://yh382.github.io/climmate-legal/terms")
              }
            />
          </Section>

          {/* Destructive actions */}
          <Section>
            <SettingsRow
              icon="rectangle.portrait.and.arrow.right"
              iconBg="#FF3B30"
              label={tr("退出登录", "Logout")}
              onPress={handleLogout}
            />
            <SettingsRow
              icon="trash.fill"
              iconBg="#FF3B30"
              label={tr("删除账号", "Delete Account")}
              onPress={handleDeleteAccount}
            />
          </Section>
        </Form>
      </Host>
    </>
  );
}
