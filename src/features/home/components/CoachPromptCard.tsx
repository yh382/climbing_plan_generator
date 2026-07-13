import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import PressableScale from "@/components/ui/PressableScale";
import { useCoachDailyPrompt } from "../hooks/useCoachDailyPrompt";

// Daily Coach prompt card on home. BE caches by (user_id, UTC date) in
// coach_daily_prompts (Window BC γ3). On loading / failure we render a
// hardcoded fallback so the card is never empty.
// DL v1 §3 — Coach is Home's single focus and its ONLY object card (white,
// hairline border); every other Home section is de-carded typography.
export function CoachPromptCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const { data, loading } = useCoachDailyPrompt();

  const fallback = tr(
    "想升级训练计划？我可以根据你最近的 session 给点建议。",
    "Want to level up your training? I can suggest tweaks based on your recent sessions.",
  );
  const prompt = data?.prompt ?? fallback;

  return (
    <PressableScale style={styles.card} onPress={() => router.push("/coach" as any)}>
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={15} color={colors.accent} />
        <Text style={styles.title}>{tr("Coach Paddi", "Coach Paddi")}</Text>
      </View>
      <Text style={styles.body}>{prompt}</Text>
      {data?.today_plan_summary ? (
        <Text style={styles.summary}>{data.today_plan_summary}</Text>
      ) : null}
      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>
          {loading
            ? tr("加载中…", "Loading…")
            : tr("追问 →", "Ask follow-up →")}
        </Text>
      </View>
    </PressableScale>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    // DL v1 §2.1 object card: white / r16 / hairline / one-notch shadow.
    card: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
      backgroundColor: c.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: 18,
      ...theme.shadow.card,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginBottom: 11,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    body: {
      fontFamily: theme.fonts.regular,
      fontSize: 14.5,
      lineHeight: 22,
      color: c.textPrimary,
      marginBottom: 8,
    },
    summary: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
      marginBottom: 12,
    },
    ctaRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
    ctaText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.accent,
    },
  });
