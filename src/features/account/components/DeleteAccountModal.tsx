// src/features/account/components/DeleteAccountModal.tsx
// Three-layer delete confirmation:
//   1) Modal sheet — describes irreversibility + counts what will be lost
//   2) Type-username gate — proves intent (enables the red button)
//   3) Device biometric / passcode — Apple guideline destructive-action floor
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";

import { useThemeColors } from "src/lib/useThemeColors";
import type { theme } from "src/lib/theme";
import { confirmDeviceAuth } from "src/features/account/api";

type ColorPalette = ReturnType<typeof useThemeColors>;

export type DeleteAccountModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => Promise<void>;
  username: string;
  // Localized translator. Caller passes (zh, en) -> string.
  tr: (zh: string, en: string) => string;
};

export default function DeleteAccountModal({
  visible,
  onClose,
  onConfirmed,
  username,
  tr,
}: DeleteAccountModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  // Reset transient state when the sheet closes — caller may re-open.
  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    setTyped("");
    setBusy(false);
    onClose();
  }, [onClose]);

  const enabled = typed.trim() === username && !busy;

  const handleDelete = useCallback(async () => {
    if (!enabled) return;
    setBusy(true);

    const ok = await confirmDeviceAuth(
      tr("确认删除账号", "Confirm Account Deletion"),
    );
    if (!ok) {
      setBusy(false);
      return;
    }

    try {
      await onConfirmed();
      // onConfirmed is responsible for navigation away — the sheet will
      // unmount with the parent screen.
    } catch (e: any) {
      setBusy(false);
      Alert.alert(
        tr("删除失败", "Delete Failed"),
        e?.message ?? tr("请稍后重试。", "Please try again later."),
      );
    }
  }, [enabled, onConfirmed, tr]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={["auto"]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      onDidDismiss={handleDismiss}
    >
      <View style={styles.body}>
        <Text style={styles.title}>
          {tr("永久删除账号", "Permanently Delete Account")}
        </Text>

        <Text style={styles.subtitle}>
          {tr(
            "此操作无法撤销。删除后以下所有数据将被永久清除，且无法恢复：",
            "This cannot be undone. The following will be permanently erased:",
          )}
        </Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            {tr(
              "• 所有训练记录、攀登日志、训练计划",
              "• All training sessions, climb logs, and plans",
            )}
          </Text>
          <Text style={styles.bullet}>
            {tr(
              "• 你发布的帖子、评论、徽章、消息",
              "• Posts, comments, badges, and messages you authored",
            )}
          </Text>
          <Text style={styles.bullet}>
            {tr(
              "• 头像、封面、所有上传的图片与视频",
              "• Avatar, cover, and all uploaded photos & videos",
            )}
          </Text>
          <Text style={styles.bullet}>
            {tr(
              "• 你的关注、屏蔽列表、隐私设置",
              "• Follows, blocks, and privacy settings",
            )}
          </Text>
        </View>

        <Text style={styles.tipText}>
          {tr(
            "若想保留数据副本，请先在「隐私 → 导出我的数据」下载 zip 备份。",
            "If you want a copy of your data, download a zip backup first via Export my data.",
          )}
        </Text>

        <Text style={styles.confirmLabel}>
          {tr("输入用户名以确认：", "Type your username to confirm:")}
          <Text style={styles.usernameHint}>{`  ${username}`}</Text>
        </Text>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder={username}
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
        />

        <TouchableOpacity
          onPress={handleDelete}
          disabled={!enabled}
          style={[styles.deleteBtn, !enabled && styles.deleteBtnDisabled]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteBtnText}>
              {tr("永久删除账号", "Permanently Delete Account")}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => sheetRef.current?.dismiss()}
          disabled={busy}
          style={styles.cancelBtn}
        >
          <Text style={[styles.cancelBtnText, busy && { opacity: 0.4 }]}>
            {tr("取消", "Cancel")}
          </Text>
        </TouchableOpacity>
      </View>
    </TrueSheet>
  );
}

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 32,
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
      marginBottom: 12,
    },
    bullets: {
      marginBottom: 16,
    },
    bullet: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    tipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: "italic",
      marginBottom: 24,
      lineHeight: 18,
    },
    confirmLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    usernameHint: {
      fontFamily: "DMMono-Regular",
      color: "#FF3B30",
      fontWeight: "500",
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 24,
    },
    deleteBtn: {
      backgroundColor: "#FF3B30",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: 8,
    },
    deleteBtnDisabled: {
      opacity: 0.4,
    },
    deleteBtnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    cancelBtn: {
      paddingVertical: 14,
      alignItems: "center",
    },
    cancelBtnText: {
      color: colors.textPrimary,
      fontSize: 16,
    },
  });
