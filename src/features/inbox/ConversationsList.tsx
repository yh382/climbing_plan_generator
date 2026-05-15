import React, { useCallback, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useChatStore } from "@/store/useChatStore";
import { useSettings } from "@/contexts/SettingsContext";
import type { ChatConversationOut } from "@/features/chat/types";
import { isSystemAssistant, resolveSystemContent } from "@/lib/systemAssistant";

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

interface Props {
  listHeader?: React.ReactNode;
}

/**
 * Chat conversations list, extracted from former ChatListScreen.
 *
 * NOTE: This is a pure list component. It does NOT manage screen header
 * (no `navigation.setOptions` / `useLayoutEffect`). Header is the
 * parent inbox screen's responsibility — mixing here would cause
 * react-navigation options to bubble up and fight the parent's title.
 *
 * `listHeader` is rendered as ListHeaderComponent so the FlatList's
 * `contentInsetAdjustmentBehavior="automatic"` correctly accounts for it
 * under the native large header.
 */
export default function ConversationsList({ listHeader }: Props = {}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const { conversations, loading, fetchConversations } = useChatStore();

  // Local refresh state for pull-to-refresh only. Keeping this decoupled from
  // the store's `loading` prevents background fetches (focus entry, 30s silent
  // refresh, future WS reconcile) from animating the RefreshControl and pushing
  // content down.
  const [refreshing, setRefreshing] = useState(false);

  // Focus entry fetches once; then 30s silent refresh while the inbox list is
  // visible. Interval is cleared on blur (leaving inbox / push to chat thread),
  // so there's zero background work when user isn't looking. Thread-level
  // realtime (5s increment polling in useChatStore) runs independently once
  // user enters a specific conversation.
  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      const timer = setInterval(
        () => fetchConversations({ silent: true }),
        30_000,
      );
      return () => clearInterval(timer);
    }, [fetchConversations]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchConversations({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchConversations]);

  const renderItem = useCallback(
    ({ item }: { item: ChatConversationOut }) => {
      const hasUnread = item.unread_count > 0;
      const isOfficial = isSystemAssistant(item.other_user_id);

      const displayName = isOfficial
        ? tr("ClimMate 小助手", "ClimMate Assistant")
        : item.other_user_name || tr("用户", "User");

      const preview =
        (isOfficial
          ? resolveSystemContent(item.last_message_preview, tr)
          : item.last_message_preview) ||
        tr("暂无消息", "No messages yet");

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
              <Ionicons name="person" size={14} color={colors.textTertiary} />
            </View>
          )}

          <View style={styles.middle}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {isOfficial ? (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.accent}
                  style={styles.officialBadge}
                />
              ) : null}
            </View>
            <Text style={styles.preview} numberOfLines={1}>
              {preview}
            </Text>
          </View>

          <View style={styles.right}>
            <Text style={styles.time}>{relativeTime(item.last_message_at)}</Text>
            {hasUnread ? <View style={styles.unreadDot} /> : null}
          </View>
        </TouchableOpacity>
      );
    },
    [router, tr, styles, colors],
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={<>{listHeader}</>}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        loading && conversations.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="small" color={colors.textPrimary} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{tr("还没有消息", "No messages yet")}</Text>
          </View>
        )
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.screenPadding,
      paddingVertical: 10,
      gap: 12,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    middle: { flex: 1, gap: 3 },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    name: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    officialBadge: {
      marginLeft: 2,
    },
    preview: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    right: {
      alignItems: "flex-end",
      gap: 6,
      minWidth: 40,
    },
    time: {
      fontSize: 11,
      fontFamily: theme.fonts.monoRegular,
      color: colors.textTertiary,
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    centerWrap: {
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
  });
