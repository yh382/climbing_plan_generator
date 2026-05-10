import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { useCoachDailyPrompt } from "../hooks/useCoachDailyPrompt";

// Daily Coach prompt card on home. BE caches by (user_id, UTC date) in
// coach_daily_prompts (Window BC γ3). On loading / failure we render a
// hardcoded fallback so the card is never empty.
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
    <Pressable style={styles.card} onPress={() => router.push("/coach" as any)}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
        </View>
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
    </Pressable>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
      backgroundColor: c.backgroundSecondary,
      borderRadius: theme.borderRadius.card,
      padding: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    iconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textPrimary,
    },
    body: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      lineHeight: 20,
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
