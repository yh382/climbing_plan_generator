import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authApi } from "../api";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { Card } from "@components/ui/Card";
import { useSettings } from "../../../contexts/SettingsContext";

export default function ChangePasswordScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = useMemo(
    () => confirmPwd.length === 0 || newPwd === confirmPwd,
    [newPwd, confirmPwd],
  );

  const isDifferent = useMemo(
    () => newPwd.length === 0 || newPwd !== currentPwd,
    [newPwd, currentPwd],
  );

  const canSubmit = useMemo(
    () =>
      currentPwd.length > 0 &&
      newPwd.length >= 6 &&
      newPwd === confirmPwd &&
      newPwd !== currentPwd &&
      !loading,
    [currentPwd, newPwd, confirmPwd, loading],
  );

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await authApi.changePassword(currentPwd, newPwd);
      Alert.alert(tr("成功", "Success"), tr("密码已修改。", "Password changed successfully."));
      router.back();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("401") || msg.includes("Wrong") || msg.includes("incorrect")) {
        setError(tr("当前密码不正确。", "Current password is incorrect."));
      } else {
        Alert.alert(tr("错误", "Error"), msg || tr("发生错误，请重试。", "Something went wrong."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable style={styles.headerBack} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{tr("修改密码", "Change Password")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{tr("当前密码", "Current password")}</Text>
            <TextInput
              value={currentPwd}
              onChangeText={(v) => { setCurrentPwd(v); setError(""); }}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{tr("新密码", "New password")}</Text>
            <TextInput
              value={newPwd}
              onChangeText={setNewPwd}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            {newPwd.length > 0 && newPwd.length < 6 ? (
              <Text style={styles.errorText}>{tr("至少 6 个字符", "At least 6 characters")}</Text>
            ) : null}
            {newPwd.length >= 6 && !isDifferent ? (
              <Text style={styles.errorText}>{tr("新密码不能与当前密码相同", "New password must be different")}</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{tr("确认新密码", "Confirm new password")}</Text>
            <TextInput
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            {confirmPwd.length > 0 && !passwordsMatch ? (
              <Text style={styles.errorText}>{tr("密码不一致", "Passwords don't match")}</Text>
            ) : null}
          </View>
        </Card>

        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.button,
            { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>
            {loading ? tr("提交中...", "Saving...") : tr("确认修改", "Save")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  card: {
    borderRadius: 14,
    padding: 0,
    overflow: "hidden",
  },
  fieldWrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
  },
  errorText: {
    marginTop: 6,
    color: "#E24B4A",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  button: {
    marginTop: 24,
    height: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C1C1E",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
