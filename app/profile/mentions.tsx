import { useEffect, useState, useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { communityApi } from "../../src/features/community/api";
import type { MentionOut } from "../../src/features/community/types";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useSettings } from "src/contexts/SettingsContext";
import type { ThemeColors } from "../../src/lib/theme";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Mentions() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mentions, setMentions] = useState<MentionOut[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("提及", "Mentions"),
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, lang]);

  useEffect(() => {
    (async () => {
      try {
        const data = await communityApi.getMentions();
        setMentions(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.textSecondary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          {mentions.map((item) => (
            <View key={item.id} style={styles.mentionCard}>
              <View style={styles.row}>
                {item.mentionerAvatar ? (
                  <Image source={{ uri: item.mentionerAvatar }} style={styles.avatarPlaceholder} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.mentionText}>
                    <Text style={styles.bold}>{item.mentionerName}</Text>{" "}
                    {tr("在", "mentioned you in a ")}{item.contentType}{tr("中提到了你", "")}
                  </Text>
                  {item.contentPreview ? (
                    <Text style={styles.preview} numberOfLines={1}>{item.contentPreview}</Text>
                  ) : null}
                  <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            </View>
          ))}
          {mentions.length === 0 && (
            <Text style={styles.emptyText}>{tr("暂无提及", "No mentions yet")}</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  mentionCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBorder },
  mentionText: { fontSize: 15, color: colors.textPrimary, lineHeight: 20 },
  bold: { fontWeight: "600" },
  preview: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
});
