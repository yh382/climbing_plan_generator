import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const t = (en: string) => en;

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const router = useRouter();

  const [email, setEmail] = useState("");
  const canSubmit = useMemo(() => email.trim().length > 0, [email]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }]}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={22} color={isDark ? "#E5E7EB" : "#0F172A"} />
        <Text style={[styles.backText, { color: isDark ? "#E5E7EB" : "#0F172A" }]}>{t("Back")}</Text>
      </Pressable>

      <Text style={[styles.title, { color: isDark ? "#E5E7EB" : "#0F172A" }]}>{t("Forgot password")}</Text>
      <Text style={[styles.subtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
        {t("Enter your email and we’ll send a reset link. (Coming soon)")}
      </Text>

      <View style={{ marginTop: 18 }}>
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

        <Pressable
          disabled={!canSubmit}
          onPress={() => Alert.alert(t("Coming soon"), t("Reset password API is not ready yet."))}
          style={({ pressed }) => [
            styles.button,
            { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>{t("Send reset link")}</Text>
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

  label: { fontSize: 12, fontWeight: "700", marginBottom: 8, marginTop: 18 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
  },

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
