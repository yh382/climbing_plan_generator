import React, { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useChatStore } from "../../../store/useChatStore";
import { useSettings } from "../../../contexts/SettingsContext";
import type { ChatConversationOut } from "../types";

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function ChatListScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const { tr } = useSettings();
  const { conversations, loading, fetchConversations } = useChatStore();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("消息", "Messages"),
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <Host matchContents>
          <SUIButton
            systemImage={"chevron.backward" as any}
            label=""
            onPress={() => router.back()}
            modifiers={[buttonStyle("plain"), labelStyle("iconOnly"), frame({ width: 34, height: 34, alignment: "center" })]}
          />
        </Host>
      ),
    });
  }, [navigation, tr, router]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      pollRef.current = setInterval(fetchConversations, 10000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [fetchConversations]),
  );

  const onRefresh = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  const renderItem = useCallback(
    ({ item }: { item: ChatConversationOut }) => {
      const hasUnread = item.unread_count > 0;
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => router.push(`/chat/${item.id}` as any)}
        >
          {item.other_user_avatar ? (
            <Image source={{ uri: item.other_user_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={22} color="#9CA3AF" />
            </View>
          )}

          <View style={styles.middle}>
            <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
              {item.other_user_name || "User"}
            </Text>
            <Text style={[styles.preview, hasUnread && styles.previewBold]} numberOfLines={1}>
              {item.last_message_preview || tr("暂无消息", "No messages yet")}
            </Text>
          </View>

          <View style={styles.right}>
            <Text style={styles.time}>{relativeTime(item.last_message_at)}</Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count > 99 ? "99+" : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [router, tr, styles],
  );

  return (
    <View style={styles.container}>
      {loading && conversations.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>{tr("暂无对话", "No conversations yet")}</Text>
            </View>
          }
          contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: { flex: 1, marginLeft: 12 },
  name: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
  },
  nameBold: { fontWeight: "700", fontFamily: theme.fonts.bold },
  preview: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  previewBold: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  right: { alignItems: "flex-end", marginLeft: 8 },
  time: {
    ...theme.typography.caption,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
  badge: {
    marginTop: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: "#FFF",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
});
