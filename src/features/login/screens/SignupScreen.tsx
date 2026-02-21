import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const t = (en: string) => en;

function isValidUsername(u: string) {
  // 允许大小写 + 数字 + 下划线，3-20
  if (u.length < 3 || u.length > 20) return false;
  return /^[A-Za-z0-9_]+$/.test(u);
}

export default function SignupScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

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

  const onCreate = () => {
    Alert.alert(t("Coming soon"), t("Signup API is not ready yet."));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }]}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color={isDark ? "#E5E7EB" : "#0F172A"} />
        <Text style={[styles.backText, { color: isDark ? "#E5E7EB" : "#0F172A" }]}>{t("Back")}</Text>
      </Pressable>

      <Text style={[styles.title, { color: isDark ? "#E5E7EB" : "#0F172A" }]}>{t("Create account")}</Text>
      <Text style={[styles.subtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
        {t("Sign up is coming soon. We’ll enable it after backend is ready.")}
      </Text>

      <View style={{ marginTop: 18 }}>
        <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155" }]}>{t("Username")}</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="e.g. TestUser_01"
          placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          style={[
            styles.input,
            { color: isDark ? "#E5E7EB" : "#0F172A", borderColor: isDark ? "#1F2A44" : "#E2E8F0" },
          ]}
        />
        <Text style={[styles.hint, { color: isDark ? "#94A3B8" : "#64748B" }]}>
          {t("3–20 characters. Letters, numbers, underscore. Case is allowed.")}
        </Text>
        {usernameTrim.length > 0 && !usernameOk ? (
          <Text style={styles.errorText}>{t("Invalid username format")}</Text>
        ) : null}

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

        <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155" }]}>{t("Password")}</Text>
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

        <Text style={[styles.label, { color: isDark ? "#CBD5E1" : "#334155" }]}>{t("Confirm password")}</Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          style={[
            styles.input,
            { color: isDark ? "#E5E7EB" : "#0F172A", borderColor: isDark ? "#1F2A44" : "#E2E8F0" },
          ]}
        />
        {confirm.length > 0 && !passwordsMatch ? (
          <Text style={styles.errorText}>{t("Passwords do not match")}</Text>
        ) : null}

        <Pressable
          disabled={!canSubmit}
          onPress={onCreate}
          style={({ pressed }) => [styles.button, { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.buttonText}>{t("Create account")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backText: { fontSize: 14, fontWeight: "600" },

  title: { fontSize: 26, fontWeight: "900", marginTop: 8 },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20 },

  label: { fontSize: 12, fontWeight: "700", marginBottom: 8, marginTop: 14 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  hint: { marginTop: 8, fontSize: 12, lineHeight: 16 },

  errorText: { marginTop: 8, color: "#B91C1C", fontSize: 12, fontWeight: "600" },

  button: {
    marginTop: 20,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00665E",
  },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
