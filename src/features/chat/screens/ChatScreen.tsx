import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import { useChatStore } from "../../../store/useChatStore";
import { useUserStore } from "../../../store/useUserStore";
import { useSettings } from "@/contexts/SettingsContext";
import ChatBubble from "../components/ChatBubble";
import ChatDateSeparator from "../components/ChatDateSeparator";
import ChatInput from "../components/ChatInput";
import type { ChatMessageOut } from "../types";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { isSystemAssistant, resolveSystemContent } from "@/lib/systemAssistant";

type ChatListItem =
  | { type: "date"; key: string; iso: string }
  | { type: "message"; key: string; msg: ChatMessageOut };

function buildChatListItems(messages: ChatMessageOut[]): ChatListItem[] {
  const items: ChatListItem[] = [];
  let lastDateKey: string | null = null;
  for (const m of messages) {
    const d = new Date(m.created_at);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dateKey !== lastDateKey) {
      items.push({ type: "date", key: `date_${dateKey}`, iso: m.created_at });
      lastDateKey = dateKey;
    }
    items.push({ type: "message", key: m.id, msg: m });
  }
  return items;
}

export default function ChatScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const navigation = useNavigation();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const myUserId = useUserStore((s) => s.user?.id ?? "");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Suppresses the "Start a conversation" flash between mount and first fetch resolve.
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

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
  const { tr } = useSettings();

  const otherUser = conversations.find((c) => c.id === conversationId);
  const isOfficial = isSystemAssistant(otherUser?.other_user_id);
  const headerTitle = isOfficial
    ? tr("ClimMate 小助手", "ClimMate Assistant")
    : otherUser?.other_user_name || "Chat";

  useLayoutEffect(() => {
    navigation.setOptions({
      title: headerTitle,
      headerTransparent: HEADER_TRANSPARENT,
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
      headerTitle: isOfficial
        ? () => (
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitleText}>{headerTitle}</Text>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.accent}
              />
            </View>
          )
        : undefined,
    });
  }, [navigation, router, headerTitle, isOfficial, colors, styles]);

  useEffect(() => {
    if (!conversationId) return;
    setInitialized(false);
    selectConversation(conversationId);
    fetchMessages(conversationId).finally(() => setInitialized(true));
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

  const listItems = useMemo(() => buildChatListItems(messages), [messages]);

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.type === "date") {
        return <ChatDateSeparator iso={item.iso} />;
      }
      // Sentinel content stored as a placeholder by the backend; localize at
      // render time so we never have to migrate historical messages when
      // copy changes. resolveSystemContent passes through real content.
      const resolved = resolveSystemContent(item.msg.content, tr, { multiline: true });
      const displayMsg =
        resolved !== item.msg.content
          ? { ...item.msg, content: resolved ?? item.msg.content }
          : item.msg;
      return <ChatBubble message={displayMsg} isMe={displayMsg.sender_id === myUserId} />;
    },
    [myUserId, tr],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={flatListRef}
        data={listItems}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        // `automatic` gets blocked by KeyboardAvoidingView intermediary on iOS,
        // causing content to render under status bar until keyboard triggers a
        // re-layout. Set insets explicitly to keep `headerTransparent` + the
        // `scrollEdgeEffects` blur behavior working reliably on first mount.
        contentInsetAdjustmentBehavior="never"
        contentInset={{ top: headerHeight, bottom: 0 }}
        scrollIndicatorInsets={{ top: headerHeight }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          initialized ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {tr("开始对话", "Start a conversation")}
              </Text>
            </View>
          ) : null
        }
      />

      <View style={{ paddingBottom: keyboardVisible ? 0 : insets.bottom }}>
        <ChatInput onSend={handleSend} />
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  listContent: { paddingVertical: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: colors.textTertiary },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerTitleText: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
});
