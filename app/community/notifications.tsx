// app/community/notifications.tsx

import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications, Notification } from "../../src/features/community/hooks";

// Map notification kind → icon + colors for visual distinction
function kindStyle(kind: string): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  switch (kind) {
    case "post_liked":
      return { icon: "heart", color: "#EF4444", bg: "#FEE2E2" };
    case "post_commented":
    case "comment_replied":
      return { icon: "chatbubble", color: "#3B82F6", bg: "#DBEAFE" };
    case "new_follower":
      return { icon: "person-add", color: "#8B5CF6", bg: "#EDE9FE" };
    case "badge_awarded":
      return { icon: "ribbon", color: "#F59E0B", bg: "#FEF3C7" };
    case "challenge_started":
    case "challenge_ended":
      return { icon: "trophy", color: "#F97316", bg: "#FFEDD5" };
    case "event_reminder":
    case "event_started":
      return { icon: "calendar", color: "#10B981", bg: "#D1FAE5" };
    case "mention":
      return { icon: "at", color: "#06B6D4", bg: "#CFFAFE" };
    default:
      return { icon: "notifications", color: "#6B7280", bg: "#F3F4F6" };
  }
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

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = useCallback(() => { refresh(); }, [refresh]);

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.readAt;
    return (
      <TouchableOpacity
        style={[styles.itemContainer, isUnread && styles.unreadBg]}
        activeOpacity={0.7}
        onPress={() => {
          if (isUnread) markRead(item.id);
          const postId = item.meta?.post_id;
          if (postId && (item.kind === "post_liked" || item.kind === "post_commented" || item.kind === "comment_replied")) {
            router.push(`/community/post/${postId}` as any);
          } else if (item.kind === "new_follower" && item.meta?.actor_id) {
            router.push(`/community/u/${item.meta.actor_id}` as any);
          } else if ((item.kind === "challenge_started" || item.kind === "challenge_ended") && item.meta?.challenge_id) {
            router.push(`/community/challenges/${item.meta.challenge_id}` as any);
          } else if ((item.kind === "event_reminder" || item.kind === "event_started") && item.meta?.event_id) {
            router.push(`/community/events/${item.meta.event_id}` as any);
          }
        }}
      >
        {/* Icon */}
        {(() => {
          const s = kindStyle(item.kind);
          return (
            <View style={[styles.iconCircle, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={18} color={s.color} />
            </View>
          );
        })()}

        {/* Text Content */}
        <View style={styles.content}>
          <Text style={styles.text} numberOfLines={2}>
            <Text style={styles.boldName}>{item.title}</Text>
            {item.body ? ` ${item.body}` : ""}
          </Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>

        {/* Unread dot */}
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          routeName="notifications"
          title="Notifications"
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
        />
      </View>

      {/* Mark All Read */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllRow} onPress={markAllRead} activeOpacity={0.7}>
          <Ionicons name="checkmark-done" size={16} color="#4F46E5" />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {loading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color="#E5E7EB" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#111" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  unreadBg: {
    backgroundColor: "#F9FAFB",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    marginRight: 12,
    justifyContent: "center",
  },
  text: {
    fontSize: 14,
    color: "#111",
    lineHeight: 20,
  },
  boldName: {
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  markAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
});
