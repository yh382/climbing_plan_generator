import React, { useLayoutEffect, useState } from "react";
import { Alert, Linking, Platform, useColorScheme } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import * as Sharing from "expo-sharing";

import { Host, Form, Section, Picker, Text, LabeledContent, Label, ZStack, Image } from "@expo/ui/swift-ui";
import { pickerStyle, tag, frame, background, shapes, font, foregroundStyle, scrollContentBackground } from "@expo/ui/swift-ui/modifiers";

import { useSettings } from "src/contexts/SettingsContext";
import { useAuthStore } from "src/store/useAuthStore";
import { useUserStore } from "src/store/useUserStore";
import { useThemeColors } from "src/lib/useThemeColors";
import { downloadAccountExport, resendVerification } from "src/features/account/api";
import DeleteAccountModal from "src/features/account/components/DeleteAccountModal";
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
  const username = useUserStore((s) => s.user?.username ?? "");
  const emailVerified = useUserStore((s) => s.user?.email_verified ?? true);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

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
    if (!username) {
      Alert.alert(
        tr("错误", "Error"),
        tr("用户信息加载中，请稍后重试。", "User info still loading, please try again."),
      );
      return;
    }
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    await deleteAccount();
    setDeleteModalOpen(false);
    router.replace("/login");
  };

  const handleResendVerification = async () => {
    if (resendingVerification) return;
    setResendingVerification(true);
    try {
      const result = await resendVerification();
      if (result.ok) {
        Alert.alert(
          tr("验证邮件已发送", "Verification email sent"),
          tr(
            "请检查邮箱（包括垃圾邮件夹），点击链接完成验证。",
            "Check your inbox (including spam) and tap the link to verify.",
          ),
        );
      } else {
        Alert.alert(
          tr("请稍后再试", "Please wait a moment"),
          tr(
            `${result.retry_after_seconds} 秒后可再次发送。`,
            `Try again in ${result.retry_after_seconds} seconds.`,
          ),
        );
      }
    } catch (e: any) {
      Alert.alert(
        tr("发送失败", "Send failed"),
        e?.message ?? tr("请稍后重试。", "Please try again later."),
      );
    } finally {
      setResendingVerification(false);
    }
  };

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    let exportUri: string | null = null;
    try {
      const { uri } = await downloadAccountExport();
      exportUri = uri;
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error(tr("无法分享文件", "Sharing unavailable"));
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/zip",
        dialogTitle: tr("导出我的数据", "Export my data"),
        UTI: "public.zip-archive",
      });
    } catch (e: any) {
      Alert.alert(
        tr("导出失败", "Export Failed"),
        e?.message ?? tr("请稍后重试。", "Please try again later."),
      );
    } finally {
      setExporting(false);
      // Best-effort cache cleanup so the zip doesn't pile up if the user
      // exports repeatedly. iOS may evict cacheDirectory anyway.
      if (exportUri) {
        const FileSystem = await import("expo-file-system/legacy");
        FileSystem.deleteAsync(exportUri, { idempotent: true }).catch(() => {});
      }
    }
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
            {!emailVerified && (
              <SettingsRow
                icon="envelope.badge.fill"
                iconBg="#FF9500"
                label={
                  resendingVerification
                    ? tr("发送中…", "Sending…")
                    : tr("邮箱未验证 - 点击重发", "Email not verified — tap to resend")
                }
                onPress={handleResendVerification}
              />
            )}
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

          {/* Data & Account */}
          <Section title={tr("数据", "Data")}>
            <SettingsRow
              icon="square.and.arrow.down.fill"
              iconBg="#34C759"
              label={
                exporting
                  ? tr("正在导出…", "Exporting…")
                  : tr("导出我的数据", "Export my data")
              }
              onPress={handleExportData}
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

      <DeleteAccountModal
        visible={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirmed={handleConfirmDelete}
        username={username}
        tr={tr}
      />
    </>
  );
}
