import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import { useChatStore } from "../../../store/useChatStore";
import { useUserStore } from "../../../store/useUserStore";
import ChatBubble from "../components/ChatBubble";
import ChatInput from "../components/ChatInput";
import type { ChatMessageOut } from "../types";

export default function ChatScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const myUserId = useUserStore((s) => s.user?.id ?? "");

  const {
    messages,
    fetchMessages,
    sendMessage,
    markRead,
    startPolling,
    stopPolling,
    selectConversation,
    conversations,
  } = useChatStore();

  const flatListRef = useRef<FlatList>(null);

  const otherUser = conversations.find((c) => c.id === conversationId);
  const headerTitle = otherUser?.other_user_name || "Chat";

  useEffect(() => {
    if (!conversationId) return;
    selectConversation(conversationId);
    fetchMessages(conversationId);
    markRead(conversationId);
    startPolling(conversationId);
    return () => {
      stopPolling();
    };
  }, [conversationId, selectConversation, fetchMessages, markRead, startPolling, stopPolling]);

  // Mark read when new messages arrive from the other user
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.sender_id !== myUserId) {
      markRead(conversationId);
    }
  }, [messages.length, conversationId, myUserId, markRead]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text, myUserId);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [sendMessage, myUserId],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageOut }) => (
      <ChatBubble message={item} isMe={item.sender_id === myUserId} />
    ),
    [myUserId],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Start a conversation</Text>
          </View>
        }
      />

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput onSend={handleSend} />
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 0.8,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, flex: 1, textAlign: "center" },
  listContent: { paddingVertical: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.textTertiary },
});
