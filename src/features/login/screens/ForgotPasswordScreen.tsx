import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../../components/ui/HeaderButton";
import { authApi } from "../api";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const t = (en: string) => en;

export default function ForgotPasswordScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && !loading && cooldown === 0,
    [email, loading, cooldown],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSend = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
      startCooldown();
    } catch {
      // Silently handle — still show sent state to prevent email enumeration
      setSent(true);
      startCooldown();
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      startCooldown();
    } catch {} finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* 返回按钮 */}
        <View style={{ position: 'absolute', top: 52, left: 12, zIndex: 10 }}>
          <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 80 }}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" />
          </View>
          <Text style={{
            fontSize: 26, fontFamily: theme.fonts.black, color: colors.textPrimary,
            letterSpacing: -1, textAlign: 'center', marginBottom: 8,
          }}>
            Check your email
          </Text>
          <Text style={{
            fontSize: 14, color: colors.textSecondary,
            textAlign: 'center', lineHeight: 22,
          }}>
            {t("We sent a reset link to")} {email.trim()}
          </Text>

          <Pressable
            disabled={cooldown > 0 || loading}
            onPress={onResend}
            style={({ pressed }) => [
              styles.darkPill,
              { opacity: cooldown > 0 || loading ? 0.5 : pressed ? 0.9 : 1, marginTop: 28, alignSelf: 'stretch' },
            ]}
          >
            <Text style={styles.darkPillText}>
              {cooldown > 0 ? `${t("Resend")} (${cooldown}s)` : t("Resend")}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textTertiary }}>
              {t("Back to login")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* 返回按钮 (绝对定位) */}
      <View style={{ position: 'absolute', top: 52, left: 12, zIndex: 10 }}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* 锁图标圆圈 */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: 'rgba(48,110,111,0.12)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="lock-closed" size={28} color="#306E6F" />
          </View>
        </View>

        {/* 标题 */}
        <Text style={{
          fontSize: 26, fontFamily: theme.fonts.black, color: colors.textPrimary,
          letterSpacing: -1, textAlign: 'center', marginBottom: 8,
        }}>
          Forgot password?
        </Text>
        <Text style={{
          fontSize: 14, color: colors.textSecondary,
          textAlign: 'center', lineHeight: 22, marginBottom: 32,
        }}>
          Enter your email and we'll send you a reset link
        </Text>

        {/* 输入框 (无边框填充) */}
        <View style={styles.inputWrap}>
          <TextInput
            value={email} onChangeText={setEmail}
            autoCapitalize="none" keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textTertiary}
            style={styles.inputText}
          />
        </View>

        {/* 发送按钮 (深色胶囊) */}
        <Pressable
          disabled={!canSubmit}
          onPress={onSend}
          style={({ pressed }) => [
            styles.darkPill,
            { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.darkPillText}>
            {loading ? t("Sending...") : t("Send reset link")}
          </Text>
        </Pressable>
      </View>
    </View>
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
    marginTop: 20,
  },
  darkPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#306E6F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
});
