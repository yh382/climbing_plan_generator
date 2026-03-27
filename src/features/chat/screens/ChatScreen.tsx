import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "@/lib/useThemeColors";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
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
  const navigation = useNavigation();
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

  useLayoutEffect(() => {
    navigation.setOptions({
      title: headerTitle,
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
  }, [navigation, router, headerTitle]);

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
    <View style={styles.container}>
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
  listContent: { paddingVertical: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.textTertiary },
});
