import React, { useLayoutEffect } from "react";
import { Alert, Linking, Platform } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";

import { Host, Form, Section, Button, Picker, Text, LabeledContent, Label, HStack, ZStack, Spacer, Image } from "@expo/ui/swift-ui";
import { pickerStyle, tag, frame, buttonStyle, background, shapes, font, foregroundStyle } from "@expo/ui/swift-ui/modifiers";

import { useSettings } from "src/contexts/SettingsContext";
import { useAuthStore } from "src/store/useAuthStore";
import { NATIVE_HEADER_LARGE } from "../../src/lib/nativeHeaderOptions";

// 类型定义
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

// iOS Settings 风格图标：彩色圆角方块 + 白色 SF Symbol
const SettingIcon = ({ name, bg }: { name: string; bg: string }) => (
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
      headerShown: true,
      title: tr("设置", "Settings"),
    });
  }, [navigation, tr]);

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
        <Form>
          {/* Account */}
          <Section title={tr("账户", "Account")}>
            <Button onPress={() => router.push("/settings/notifications" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="bell.fill" bg="#FF9500" />
                <Text>{tr("通知", "Notifications")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => router.push("/settings/privacy" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="hand.raised.fill" bg="#5856D6" />
                <Text>{tr("隐私", "Privacy")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => router.push("/change-password" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="key.fill" bg="#8E8E93" />
                <Text>{tr("修改密码", "Change Password")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => Alert.alert(tr("提示", "Notice"), tr("该功能暂未开放", "This feature is coming soon."))} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="crown.fill" bg="#FFD60A" />
                <Text>{tr("订阅计划", "Subscription Plan")}</Text>
                <Spacer />
              </HStack>
            </Button>
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
            <Button onPress={() => router.push("/profile/saved" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="bookmark.fill" bg="#007AFF" />
                <Text>{tr("收藏", "Saved")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => router.push("/profile/blocked" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="slash.circle.fill" bg="#FF3B30" />
                <Text>{tr("已屏蔽", "Blocked")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => router.push("/profile/comments" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="bubble.left.fill" bg="#34C759" />
                <Text>{tr("评论", "Comments")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => router.push("/profile/mentions" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="at" bg="#5856D6" />
                <Text>{tr("提及", "Mentions")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => router.push("/profile/likes" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="heart.fill" bg="#FF2D55" />
                <Text>{tr("点赞", "Likes")}</Text>
                <Spacer />
              </HStack>
            </Button>
          </Section>

          {/* Misc */}
          <Section>
            <Button onPress={() => router.push("/settings/help" as any)} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="questionmark.circle.fill" bg="#8E8E93" />
                <Text>{tr("帮助", "Help")}</Text>
                <Spacer />
              </HStack>
            </Button>
          </Section>

          {/* Legal */}
          <Section title={tr("法律", "Legal")}>
            <Button onPress={() => Linking.openURL("https://yh382.github.io/climmate-legal/")} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="doc.text.fill" bg="#8E8E93" />
                <Text>{tr("隐私政策", "Privacy Policy")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={() => Linking.openURL("https://yh382.github.io/climmate-legal/terms")} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="doc.plaintext.fill" bg="#8E8E93" />
                <Text>{tr("使用条款", "Terms of Service")}</Text>
                <Spacer />
              </HStack>
            </Button>
          </Section>

          {/* Destructive actions */}
          <Section>
            <Button onPress={handleLogout} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="rectangle.portrait.and.arrow.right" bg="#FF3B30" />
                <Text>{tr("退出登录", "Logout")}</Text>
                <Spacer />
              </HStack>
            </Button>
            <Button onPress={handleDeleteAccount} modifiers={[buttonStyle("plain")]}>
              <HStack spacing={12} alignment="center">
                <SettingIcon name="trash.fill" bg="#FF3B30" />
                <Text>{tr("删除账号", "Delete Account")}</Text>
                <Spacer />
              </HStack>
            </Button>
          </Section>
        </Form>
      </Host>
    </>
  );
}
