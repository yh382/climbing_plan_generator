import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  Platform,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";

import { api } from "../../../lib/apiClient";
import { authApi } from "../api";
import { useAuthStore } from "../../../store/useAuthStore";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const mascotImg = require("../../../../assets/images/mascot.png");
const loginBg = require("../../../../assets/images/login-bg.jpg");

type LoginResp = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
};

// 临时 t()：以后接系统语言时替换成 i18n / tr()
const t = (en: string) => en;

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0,
    [email, password]
  );

  const onLogin = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const res = await api.post<LoginResp>("/auth/login", {
        email: email.trim(),
        password,
      });

      if (!res?.access_token) throw new Error("Missing access_token");

      // ✅ 你现有 store 可能只存 access；如果你已升级支持 refresh，也不会报错（多余参数忽略）
      await (setToken as any)(res.access_token, res.refresh_token ?? null, remember);

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert(t("Login failed"), e?.message ?? t("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

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

      await (setToken as any)(res.access_token, res.refresh_token ?? null, true);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(t("Apple Sign In failed"), e?.message ?? t("Unknown error"));
    }
  };

  const onForgot = () => {
    router.push("/(auth)/forgot-password");
  };

  const onSignup = () => {
    router.push("/(auth)/signup");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {/* 1. 背景图区 (320px) */}
      <ImageBackground source={loginBg} style={{ height: 320, width: '100%' }} resizeMode="cover">
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.65)', '#ffffff']}
          locations={[0, 0.55, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 }}
        />
      </ImageBackground>

      {/* 2. Mascot (叠加在图/白交界) */}
      <View style={{ alignItems: 'center', marginTop: -40, marginBottom: 14, zIndex: 10 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: colors.background, borderWidth: 3, borderColor: colors.border,
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <Image source={mascotImg} style={{ width: 74, height: 74 }} resizeMode="cover" />
        </View>
      </View>

      {/* 3. 白色表单区 */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22 }} keyboardShouldPersistTaps="handled">
        {/* 标题 */}
        <Text style={{
          fontSize: 28, fontFamily: theme.fonts.black, color: colors.textPrimary,
          letterSpacing: -1.2, textAlign: 'center', marginBottom: 5,
        }}>
          Welcome back
        </Text>
        <Text style={{
          fontSize: 13, color: colors.textTertiary, textAlign: 'center', marginBottom: 22,
        }}>
          Login to sync your plans and profile
        </Text>

        {/* Email 输入 (无 label, 无边框) */}
        <View style={styles.inputWrap}>
          <TextInput
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>

        {/* Password 输入 */}
        <View style={styles.inputWrap}>
          <TextInput
            value={password} onChangeText={setPassword}
            secureTextEntry placeholder="••••••••"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>

        {/* Remember + Forgot */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <TouchableOpacity onPress={() => setRemember(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{
              width: 16, height: 16, borderRadius: 4,
              backgroundColor: remember ? '#306E6F' : 'transparent',
              borderWidth: remember ? 0 : 1.5, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {remember && <Ionicons name="checkmark" size={10} color="#fff" />}
            </View>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>Remember me</Text>
          </TouchableOpacity>

          <Pressable onPress={onForgot}>
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Login 按钮 (深色胶囊) */}
        <Pressable
          onPress={onLogin} disabled={!canSubmit || loading}
          style={({ pressed }) => [styles.darkPill, { opacity: !canSubmit || loading ? 0.5 : pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.darkPillText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </Pressable>

        {/* 分割线 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 }}>
          <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>or</Text>
          <View style={{ flex: 1, height: 0.5, backgroundColor: colors.border }} />
        </View>

        {/* Apple 按钮 (轮廓胶囊) */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity onPress={onAppleSignIn} style={styles.applePill}>
            <Ionicons name="logo-apple" size={18} color={colors.textPrimary} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
              Continue with Apple
            </Text>
          </TouchableOpacity>
        )}

        {/* 注册入口 */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>Don't have an account? </Text>
          <Pressable onPress={onSignup}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  inputWrap: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 11,
  },
  inputText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: theme.fonts.regular,
  },
  darkPill: {
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
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
