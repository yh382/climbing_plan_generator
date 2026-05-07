import { useEffect, useState, useCallback, useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { communityApi } from "../../src/features/community/api";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useSettings } from "src/contexts/SettingsContext";
import type { ThemeColors } from "../../src/lib/theme";

interface MyComment {
  id: string;
  post_id: string;
  content_text: string;
  author_name?: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function MyComments() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("我的评论", "My Comments"),
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, lang]);

  const load = useCallback(async () => {
    try {
      const data = await communityApi.getMyComments();
      setComments(data);
    } catch (e) {
      if (__DEV__) console.warn("loadMyComments error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: MyComment }) => (
    <TouchableOpacity
      style={styles.commentCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/community/post/${item.post_id}` as any)}
    >
      <Text style={styles.commentText} numberOfLines={3}>
        {item.content_text}
      </Text>
      <View style={styles.divider} />
      <Text style={styles.meta}>{timeAgo(item.created_at)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textSecondary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{tr("暂无评论", "No comments yet")}</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  commentCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  commentText: { fontSize: 15, color: colors.textPrimary, marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginBottom: 10 },
  meta: { fontSize: 13, color: colors.textSecondary },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
});
