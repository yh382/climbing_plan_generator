// app/profile/followers.tsx

import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";

import { communityApi } from "../../src/features/community/api";
import { api } from "../../src/lib/apiClient";
import { useThemeColors } from "../../src/lib/useThemeColors";

interface FollowerUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  display_name?: string;
  is_following?: boolean;
}

export default function FollowersScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Followers",
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const targetId = userId ?? (await api.get<{ id: string }>("/users/me")).id;
      const data = await communityApi.getFollowers(targetId);
      setUsers(Array.isArray(data) ? data : []);
    } catch (_e) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  const isOtherUser = Boolean(userId);

  const renderButton = (item: FollowerUser) => {
    if (isOtherUser) {
      // Viewing another user's followers: hide button for self & already-followed
      if (item.is_following == null || item.is_following === true) return null;
      return (
        <TouchableOpacity
          style={[styles.followBtn, styles.followBtnFilled]}
          onPress={() => handleToggleFollow(item)}
          disabled={toggling.has(item.user_id)}
        >
          {toggling.has(item.user_id) ? (
            <ActivityIndicator size="small" color={colors.pillText} />
          ) : (
            <Text style={[styles.followBtnText, styles.followBtnTextFilled]}>Follow</Text>
          )}
        </TouchableOpacity>
      );
    }
    // Own followers: show Follow Back / Following toggle
    const isFollowingBack = item.is_following;
    return (
      <TouchableOpacity
        style={[
          styles.followBtn,
          isFollowingBack ? styles.followBtnOutline : styles.followBtnFilled,
        ]}
        onPress={() => handleToggleFollow(item)}
        disabled={toggling.has(item.user_id)}
      >
        {toggling.has(item.user_id) ? (
          <ActivityIndicator
            size="small"
            color={isFollowingBack ? colors.textPrimary : colors.pillText}
          />
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
    );
  };

  const renderItem = ({ item }: { item: FollowerUser }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/community/u/${item.user_id}` as any)}
      activeOpacity={0.7}
    >
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.username} numberOfLines={1}>
          {item.display_name || item.username}
        </Text>
        <Text style={styles.handle} numberOfLines={1}>@{item.username}</Text>
      </View>
      {renderButton(item)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>No followers yet</Text>
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

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { color: c.textSecondary, marginTop: 8, fontSize: 14 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.divider,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.backgroundSecondary },
    avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
    info: { flex: 1, marginLeft: 12 },
    username: { fontSize: 15, fontWeight: "700", color: c.textPrimary },
    handle: { fontSize: 13, color: c.textSecondary, marginTop: 1 },
    followBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      minWidth: 96,
      alignItems: "center",
    },
    followBtnFilled: {
      backgroundColor: c.pillBackground,
    },
    followBtnOutline: {
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.cardBackground,
    },
    followBtnText: { fontSize: 13, fontWeight: "600" },
    followBtnTextFilled: { color: c.pillText },
    followBtnTextOutline: { color: c.textPrimary },
  });
