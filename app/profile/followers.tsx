// app/profile/followers.tsx

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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import TopBar from "../../components/TopBar";
import { communityApi } from "../../src/features/community/api";
import { api } from "../../src/lib/apiClient";

interface FollowerUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  display_name?: string;
  is_following?: boolean;
}

export default function FollowersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api.get<{ id: string }>("/users/me");
      const data = await communityApi.getFollowers(me.id);
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

  const handleToggleFollow = async (user: FollowerUser) => {
    const userId = user.user_id;
    setToggling((s) => new Set(s).add(userId));
    try {
      if (user.is_following) {
        await communityApi.unfollowUser(userId);
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === userId ? { ...u, is_following: false } : u
          )
        );
      } else {
        await communityApi.followUser(userId);
        setUsers((prev) =>
          prev.map((u) =>
            u.user_id === userId ? { ...u, is_following: true } : u
          )
        );
      }
    } catch (_e) { /* swallow */ }
    finally {
      setToggling((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: FollowerUser }) => {
    const isFollowingBack = item.is_following;
    return (
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
          style={[
            styles.followBtn,
            isFollowingBack ? styles.followBtnOutline : styles.followBtnFilled,
          ]}
          onPress={() => handleToggleFollow(item)}
          disabled={toggling.has(item.user_id)}
        >
          {toggling.has(item.user_id) ? (
            <ActivityIndicator size="small" color={isFollowingBack ? "#111" : "#FFF"} />
          ) : (
            <Text
              style={[
                styles.followBtnText,
                isFollowingBack ? styles.followBtnTextOutline : styles.followBtnTextFilled,
              ]}
            >
              {isFollowingBack ? "Following" : "Follow Back"}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF", paddingTop: insets.top }}>
      <TopBar
        routeName="followers"
        title="Followers"
        useSafeArea={false}
        leftControls={{ mode: "back", onBack: () => router.back() }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#E5E7EB" />
          <Text style={styles.emptyText}>No followers yet</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.user_id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
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
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 96,
    alignItems: "center",
  },
  followBtnFilled: {
    backgroundColor: "#111",
  },
  followBtnOutline: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFF",
  },
  followBtnText: { fontSize: 13, fontWeight: "600" },
  followBtnTextFilled: { color: "#FFF" },
  followBtnTextOutline: { color: "#111" },
});
