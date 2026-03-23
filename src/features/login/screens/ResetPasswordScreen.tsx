import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const t = (en: string) => en;

export default function ResetPasswordScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordsMatch = useMemo(() => confirm.length === 0 || password === confirm, [password, confirm]);
  const canSubmit = useMemo(() => password.length >= 6 && password === confirm, [password, confirm]);

  const onSubmit = () => {
    Alert.alert(t("Coming soon"), t("Email verification setup required."));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 返回按钮 (绝对定位) */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ position: 'absolute', top: 60, left: 22, zIndex: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{
          fontSize: 26, fontFamily: theme.fonts.black, color: colors.textPrimary,
          letterSpacing: -1, textAlign: 'center', marginBottom: 8,
        }}>
          {t("Reset password")}
        </Text>
        <Text style={{
          fontSize: 14, color: colors.textSecondary,
          textAlign: 'center', lineHeight: 22, marginBottom: 32,
        }}>
          {t("Enter your new password.")}
        </Text>

        <Text style={styles.label}>{t("New password")}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={password} onChangeText={setPassword}
            secureTextEntry placeholder="••••••••"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>
        {password.length > 0 && password.length < 6 ? (
          <Text style={styles.errorText}>{t("Password must be at least 6 characters")}</Text>
        ) : null}

        <Text style={styles.label}>{t("Confirm password")}</Text>
        <View style={[styles.inputWrap, confirm.length > 0 && !passwordsMatch && styles.inputError]}>
          <TextInput
            value={confirm} onChangeText={setConfirm}
            secureTextEntry placeholder="••••••••"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>
        {confirm.length > 0 && !passwordsMatch ? (
          <Text style={styles.errorText}>{t("Passwords do not match")}</Text>
        ) : null}

        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          style={({ pressed }) => [styles.darkPill, { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.darkPillText}>{t("Reset password")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrap: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#E24B4A',
  },
  inputText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: theme.fonts.regular,
  },
  errorText: {
    marginTop: 6,
    color: '#E24B4A',
    fontSize: 12,
    fontWeight: '600',
  },
  darkPill: {
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  darkPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
