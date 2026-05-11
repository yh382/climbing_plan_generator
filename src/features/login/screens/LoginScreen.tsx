import React, { useEffect, useMemo, useState } from "react";
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
  TouchableWithoutFeedback,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
  useColorScheme,
} from "react-native";

const COVER_HEIGHT = Math.round(Dimensions.get("window").height * 0.35);
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { LinearGradient } from "expo-linear-gradient";

import { api } from "../../../lib/apiClient";
import { authApi } from "../api";
import { useGoogleAuth } from "../useGoogleAuth";
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
  const isDark = useColorScheme() === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  // Google sign-in: hook returns a loaded request + the most recent prompt
  // response. We disable the button until the request loads (avoids tapping
  // before the OAuth URL is ready) and react to the response in a useEffect.
  const [googleRequest, googleResponse, promptGoogleAsync] = useGoogleAuth();
  const [googleBusy, setGoogleBusy] = useState(false);

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

      router.replace("/(drawer)/(tabs)" as any);
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

      const res = await authApi.appleSignIn(
        identityToken,
        fullName,
        credential.authorizationCode,
      );
      if (!res?.access_token) throw new Error("Missing access_token");

      await (setToken as any)(res.access_token, res.refresh_token ?? null, true);
      router.replace("/(drawer)/(tabs)" as any);
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert(t("Apple Sign In failed"), e?.message ?? t("Unknown error"));
    }
  };

  const onGoogleSignIn = async () => {
    if (!googleRequest || googleBusy) return;
    setGoogleBusy(true);
    try {
      // promptAsync handles cancellations internally; the actual response
      // (success/cancel/error) is delivered via the `googleResponse` effect
      // below, so this call is fire-and-forget aside from setting the busy
      // flag for button affordance.
      await promptGoogleAsync();
    } catch (e: any) {
      Alert.alert(t("Google Sign In failed"), e?.message ?? t("Unknown error"));
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type !== "success") {
      // 'cancel' / 'dismiss' are user-initiated and shouldn't error.
      // 'error' is rare (e.g. mis-configured client) — surface so we notice.
      if (googleResponse.type === "error") {
        Alert.alert(
          t("Google Sign In failed"),
          googleResponse.error?.message ?? t("Unknown error"),
        );
      }
      setGoogleBusy(false);
      return;
    }
    const idToken = googleResponse.params?.id_token;
    if (!idToken) {
      Alert.alert(t("Google Sign In failed"), t("Missing ID token"));
      setGoogleBusy(false);
      return;
    }

    (async () => {
      try {
        const res = await authApi.googleSignIn(idToken);
        if (!res?.access_token) throw new Error("Missing access_token");
        await (setToken as any)(res.access_token, res.refresh_token ?? null, true);
        router.replace("/(drawer)/(tabs)" as any);
      } catch (e: any) {
        const msg = e?.message ?? t("Unknown error");
        // BE returns 400 with "Email already registered with X. Please sign
        // in with that method." for cross-provider conflicts.
        const isConflict = msg.includes("already registered with");
        Alert.alert(
          isConflict ? t("Account exists") : t("Google Sign In failed"),
          msg,
        );
      } finally {
        setGoogleBusy(false);
      }
    })();
  }, [googleResponse, router, setToken]);

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
      {/* Cover + mascot region — tap to dismiss keyboard. The ScrollView
          below already handles tap-to-dismiss via keyboardShouldPersistTaps,
          but those props don't reach this region. */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View>
          {/* 1. 背景图区 (35% of screen) */}
          <ImageBackground source={loginBg} style={{ height: COVER_HEIGHT, width: '100%' }} resizeMode="cover">
            <StatusBar barStyle="light-content" />
            <LinearGradient
              colors={isDark
                ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)', '#000000']
                : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.65)', '#ffffff']}
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
              <Image source={mascotImg} style={{ width: 58, height: 58, tintColor: isDark ? '#fff' : '#1C1C1E' }} resizeMode="contain" />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* 3. 白色表单区 — flexGrow + space-between 把按钮组钉在底部，
              与 Signup 屏的按钮组在同一 Y 位置。 */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 上区：title + subtitle + inputs + remember row */}
        <View>
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
        </View>

        {/* 下区：Login 按钮 + or + social + Sign up link，钉在底部。
              marginTop:16 保底防小机型上下区零间距挤压。 */}
        <View style={{ marginTop: 16 }}>
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

        {/* Google 按钮 — 与 Apple 同样的轮廓胶囊 + 多色 G 图标 */}
        <TouchableOpacity
          disabled={!googleRequest || googleBusy}
          onPress={onGoogleSignIn}
          style={[
            styles.applePill,
            { marginTop: 10, opacity: !googleRequest || googleBusy ? 0.5 : 1 },
          ]}
        >
          <Ionicons name="logo-google" size={18} color={colors.textPrimary} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
            {googleBusy ? t('Connecting...') : t('Continue with Google')}
          </Text>
        </TouchableOpacity>

        {/* 注册入口 */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>Don't have an account? </Text>
          <Pressable onPress={onSignup}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>Sign up</Text>
          </Pressable>
        </View>
        </View>{/* 下区 end */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  inputWrap: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
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
