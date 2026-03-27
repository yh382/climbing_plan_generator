import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { communityApi } from "../../src/features/community/api";

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
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
        <Text style={styles.headerTitle}>My Comments</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubble-outline" size={48} color="#E5E7EB" />
          <Text style={styles.emptyText}>No comments yet</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: "#F2F2F6",
  },
  headerBtn: { width: 40 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  commentCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  commentText: { fontSize: 15, color: "#1E293B", marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 10 },
  meta: { fontSize: 13, color: "#64748B" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
});
