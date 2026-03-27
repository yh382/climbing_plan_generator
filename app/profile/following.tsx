// app/profile/following.tsx

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { communityApi } from "../../src/features/community/api";
import { api } from "../../src/lib/apiClient";

interface FollowUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  display_name?: string;
  is_following?: boolean;
}

export default function FollowingScreen() {
  const router = useRouter();

  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get<{ id: string }>("/users/me");
      const data = await communityApi.getFollowing(me.id);
      setUsers(Array.isArray(data) ? data : []);
    } catch (_e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnfollow = async (userId: string) => {
    setToggling((s) => new Set(s).add(userId));
    try {
      await communityApi.unfollowUser(userId);
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
    } catch (_e) { /* swallow */ }
    finally {
      setToggling((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/community/u/${item.user_id}` as any)}
      activeOpacity={0.7}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={20} color="#9CA3AF" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {item.display_name || item.username}
        </Text>
        <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.unfollowBtn}
        onPress={() => handleUnfollow(item.user_id)}
        disabled={toggling.has(item.user_id)}
      >
        {toggling.has(item.user_id) ? (
          <ActivityIndicator size="small" color="#111" />
        ) : (
          <Text style={styles.unfollowText}>Following</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <Stack.Screen options={{ title: "Following" }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#E5E7EB" />
          <Text style={styles.emptyText}>Not following anyone yet</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          contentInsetAdjustmentBehavior="automatic"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#9CA3AF", marginTop: 8, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3F4F6" },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginLeft: 12 },
  username: { fontSize: 15, fontWeight: "700", color: "#111" },
  handle: { fontSize: 13, color: "#9CA3AF", marginTop: 1 },
  unfollowBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 80,
    alignItems: "center",
  },
  unfollowText: { fontSize: 13, fontWeight: "600", color: "#111" },
});
