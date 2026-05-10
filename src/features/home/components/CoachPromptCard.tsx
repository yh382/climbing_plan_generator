import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";

// Soft gradient prompt card. γ window will replace mock copy with daily LLM
// prompt via useCoachDailyPrompt; for now show a friendly fallback so the
// section is not empty.
export function CoachPromptCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();

  const prompt = tr(
    "想升级训练计划？我可以根据你最近的 session 给点建议。",
    "Want to level up your training? I can suggest tweaks based on your recent sessions.",
  );

  return (
    <Pressable style={styles.card} onPress={() => router.push("/coach" as any)}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
        </View>
        <Text style={styles.title}>{tr("Coach Paddi", "Coach Paddi")}</Text>
      </View>
      <Text style={styles.body}>{prompt}</Text>
      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>{tr("追问 →", "Ask follow-up →")}</Text>
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
