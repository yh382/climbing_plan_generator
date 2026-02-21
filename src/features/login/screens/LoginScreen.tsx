import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  useColorScheme,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api } from "../../../lib/apiClient";
import { useAuthStore } from "../../../store/useAuthStore";

// ✅ 用 require 避免路径/TS 配置问题
const paddiImg = require("../../../../assets/images/favicon.png");

type LoginResp = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
};

// 临时 t()：以后接系统语言时替换成 i18n / tr()
const t = (en: string) => en;

export default function LoginScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
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

  const onForgot = () => {
    router.push("/(auth)/forgot-password");
  };

  const onSignup = () => {
    router.push("/(auth)/signup");
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Image source={paddiImg} style={styles.paddiIcon} resizeMode="contain" />
        </View>

        <Text style={[styles.title, { color: isDark ? "#E5E7EB" : "#0F172A" }]}>
          {t("Welcome back")}
        </Text>
        <Text style={[styles.subtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
          {t("Login to sync your plans and profile.")}
        </Text>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155" }]}>{t("Email")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          style={[
            styles.input,
            { color: isDark ? "#E5E7EB" : "#0F172A", borderColor: isDark ? "#1F2A44" : "#E2E8F0" },
          ]}
        />

        <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155", marginTop: 14 }]}>
          {t("Password")}
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          style={[
            styles.input,
            { color: isDark ? "#E5E7EB" : "#0F172A", borderColor: isDark ? "#1F2A44" : "#E2E8F0" },
          ]}
        />

        {/* Remember + Forgot */}
        <View style={styles.rowBetween}>
          <Pressable style={styles.rememberRow} onPress={() => setRemember((v) => !v)}>
            <Ionicons name={remember ? "checkbox" : "square-outline"} size={18} color="#00665E" />
            <Text style={[styles.rememberText, { color: isDark ? "#CBD5E1" : "#334155" }]}>
              {t("Remember me")}
            </Text>
          </Pressable>

          <Pressable onPress={onForgot}>
            <Text style={styles.link}>{t("Forgot password?")}</Text>
          </Pressable>
        </View>

        {/* Button */}
        <Pressable
          onPress={onLogin}
          disabled={!canSubmit || loading}
          style={({ pressed }) => [
            styles.button,
            {
              opacity: !canSubmit || loading ? 0.5 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={styles.buttonText}>{loading ? t("Logging in...") : t("Login")}</Text>
        </Pressable>

        {/* Signup */}
        <View style={styles.signupRow}>
          <Text style={{ color: isDark ? "#94A3B8" : "#64748B" }}>{t("Don’t have an account?")}</Text>
          <Pressable onPress={onSignup}>
            <Text style={[styles.link, { marginLeft: 6 }]}>{t("Sign up")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 72 },

  header: { marginBottom: 26 },

  // ✅ 灰线修复关键：不透明白底 + overflow hidden + 图片略放大裁切
  iconWrap: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paddiIcon: {
    width: 100,
    height: 100,
  },

  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20 },

  form: {},
  label: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  rowBetween: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rememberRow: { flexDirection: "row", alignItems: "center" },
  rememberText: { marginLeft: 6, fontSize: 13 },
  link: { color: "#00665E", fontSize: 13, fontWeight: "600" },

  button: {
    marginTop: 20,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00665E",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  signupRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
