import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { authApi } from "../api";
import { useAuthStore } from "../../../store/useAuthStore";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const mascotImg = require("../../../../assets/images/mascot.png");

const t = (en: string) => en;

function isValidUsername(u: string) {
  // 允许大小写 + 数字 + 下划线，3-20
  if (u.length < 3 || u.length > 20) return false;
  return /^[A-Za-z0-9_]+$/.test(u);
}

export default function SignupScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameTrim = username.trim();
  const emailTrim = email.trim();

  const usernameOk = useMemo(() => isValidUsername(usernameTrim), [usernameTrim]);
  const passwordsMatch = useMemo(() => confirm.length === 0 || password === confirm, [password, confirm]);

  const canSubmit = useMemo(() => {
    if (!usernameTrim || !emailTrim || !password || !confirm) return false;
    if (!usernameOk) return false;
    if (password !== confirm) return false;
    // 这里不做复杂 email 校验，后端再严格校验
    if (!emailTrim.includes("@")) return false;
    return true;
  }, [usernameTrim, emailTrim, password, confirm, usernameOk]);

  const onAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const identityToken = credential.identityToken;
      if (!identityToken) throw new Error("No identity token");

      const fullName =
        [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(" ") || undefined;

      const res = await authApi.appleSignIn(identityToken, fullName);
      if (!res?.access_token) throw new Error("Missing access_token");

      await setToken(res.access_token, res.refresh_token ?? null);
      router.replace("/(tabs)" as any);
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(t("Apple Sign In failed"), e?.message ?? t("Unknown error"));
    }
  };

  const onCreate = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const res = await authApi.register({
        username: usernameTrim,
        email: emailTrim,
        password,
      });
      if (!res?.access_token) throw new Error('Missing access_token');
      await setToken(res.access_token, res.refresh_token ?? null);
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      if (msg.includes('409') || msg.includes('already')) {
        Alert.alert(t('Registration failed'), t('Email or username already taken.'));
      } else {
        Alert.alert(t('Registration failed'), msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 80 }} keyboardShouldPersistTaps="handled">
        {/* Mascot */}
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: colors.background, borderWidth: 3, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <Image source={mascotImg} style={{ width: 74, height: 74 }} resizeMode="cover" />
          </View>
        </View>

        <Text style={{
          fontSize: 28, fontFamily: theme.fonts.black, color: colors.textPrimary,
          letterSpacing: -1.2, textAlign: 'center', marginBottom: 5,
        }}>
          Create account
        </Text>
        <Text style={{
          fontSize: 13, color: colors.textTertiary, textAlign: 'center', marginBottom: 22,
        }}>
          Start your climbing journey
        </Text>

        {/* Username */}
        <Text style={styles.label}>{t("Username")}</Text>
        <View style={[styles.inputWrap, usernameTrim.length > 0 && !usernameOk && styles.inputError]}>
          <TextInput
            value={username} onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="e.g. TestUser_01"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>
        <Text style={styles.hint}>
          {t("3–20 characters. Letters, numbers, underscore.")}
        </Text>
        {usernameTrim.length > 0 && !usernameOk ? (
          <Text style={styles.errorText}>{t("Invalid username format")}</Text>
        ) : null}

        {/* Email */}
        <Text style={styles.label}>{t("Email")}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>

        {/* Password */}
        <Text style={styles.label}>{t("Password")}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={password} onChangeText={setPassword}
            secureTextEntry placeholder="••••••••"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>

        {/* Confirm password */}
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

        {/* Create account 按钮 */}
        <Pressable
          disabled={!canSubmit || loading}
          onPress={onCreate}
          style={({ pressed }) => [styles.darkPill, { opacity: !canSubmit || loading ? 0.5 : pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.darkPillText}>{loading ? t("Creating...") : t("Create account")}</Text>
        </Pressable>

        {/* 分割线 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 }}>
          <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>or</Text>
          <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
        </View>

        {/* Apple 按钮 */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity onPress={onAppleSignIn} style={styles.applePill}>
            <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
              Sign up with Apple
            </Text>
          </TouchableOpacity>
        )}

        {/* 登录入口 */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 40 }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
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
  hint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textTertiary,
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
  applePill: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
