import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack } from "expo-router";
import { GlassView } from "expo-glass-effect";
import { NativeTextView } from "../../../modules/native-input/src";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { MenuButton } from "@/components/sidebar/Sidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useCoachChatStore } from "@/features/coachChat/state/coachChatStore";
import { useSettings } from "@/contexts/SettingsContext";
import type { CoachMode } from "@/features/coachChat/types";
import ModeDetailOverlay from "@/features/coachChat/components/ModeDetailOverlay";
import ConversationListSheet from "@/features/coachChat/components/ConversationListSheet";
import TaskBar from "@/features/coachChat/components/TaskBar";
import MessageBubble from "@/features/coachChat/components/MessageBubble";
import ThinkingBubble from "@/features/coachChat/components/ThinkingBubble";

const MODE_STARTER_PROMPTS: Record<Exclude<CoachMode, "none">, { zh: string; en: string }> = {
  plan: { zh: "帮我制定一个训练计划", en: "Help me create a training plan" },
  actions: { zh: "根据我的数据推荐训练动作", en: "Recommend exercises based on my data" },
  analysis: { zh: "分析我最近的训练数据", en: "Analyze my recent training data" },
};

export default function ClimmateScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputHeight, setInputHeight] = useState(48);
  const [inputFocused, setInputFocused] = useState(false);

  const coach = useCoachChatStore((s) => s.state);
  const createConversation = useCoachChatStore((s) => s.createConversation);
  const deleteConversation = useCoachChatStore((s) => s.deleteConversation);
  const switchConversation = useCoachChatStore((s) => s.switchConversation);
  const sendFromDock = useCoachChatStore((s) => s.sendFromDock);
  const loadConversations = useCoachChatStore((s) => s.loadConversations);
  const setOverlayOpen = useCoachChatStore((s) => s.setOverlayOpen);
  const setMode = useCoachChatStore((s) => s.setMode);

  const { tr } = useSettings();
  const accessToken = useAuthStore((s) => s.accessToken);

  const bottomBarRef = useRef<View>(null);

  // ── Native header ──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      ...withHeaderTheme(colors),
      title: "Coach Paddi",
      headerLeft: () => <MenuButton />,
    });
  }, [navigation, colors]);

  // Load conversations from backend on mount
  useEffect(() => {
    if (accessToken) loadConversations();
  }, [accessToken, loadConversations]);

  const mode = coach.mode;

  const realMessages = coach.messages;
  const showGreeting = realMessages.length === 0;
  const showThinking = coach.isBusy && !coach.streamingMsgId;

  // ── Scroll management ────────────────────────────────────────────────────
  const scrollRef = useRef<ScrollView>(null);
  const isStreamingRef = useRef(false);
  isStreamingRef.current = !!coach.streamingMsgId;

  // Scroll to bottom on conversation switch
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    });
  }, [coach.currentConversationId]);

  // Auto-scroll during AI streaming (as new tokens arrive and content grows)
  const handleContentSizeChange = useCallback((_w: number, _h: number) => {
    if (isStreamingRef.current) {
      scrollRef.current?.scrollToEnd({ animated: false });
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Layer mutual exclusion: close modals when overlay opens
  const handleOpenOverlay = useCallback(() => {
    setListOpen(false);
    Keyboard.dismiss();
    setPreviewOpen(true);
    setOverlayOpen(true);
  }, [setOverlayOpen]);

  const handleCloseOverlay = useCallback(() => {
    setPreviewOpen(false);
    setOverlayOpen(false);
  }, [setOverlayOpen]);

  const handleNewConversation = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleViewAll = useCallback(() => {
    setListOpen(true);
  }, []);

  const handleDeleteCurrent = useCallback(() => {
    if (!coach.currentConversationId) return;
    Alert.alert(
      tr("删除对话", "Delete conversation"),
      tr("确定删除当前对话？", "Delete this conversation?"),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("删除", "Delete"),
          style: "destructive",
          onPress: () => deleteConversation(coach.currentConversationId!),
        },
      ],
    );
  }, [coach.currentConversationId, deleteConversation, tr]);

  const handleToggleMode = useCallback(
    (m: CoachMode) => {
      const prevMode = useCoachChatStore.getState().state.mode;
      setMode(m);

      // Auto-send starter prompt when activating a mode (not deactivating)
      if (m !== "none" && prevMode === "none" && !useCoachChatStore.getState().state.isBusy) {
        const prompt = MODE_STARTER_PROMPTS[m];
        sendFromDock(tr(prompt.zh, prompt.en));
        requestAnimationFrame(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        });
      }
    },
    [setMode, sendFromDock, tr],
  );

  const handleSendMessage = useCallback(() => {
    const t = inputText.trim();
    if (!t || coach.isBusy) return;
    setInputText("");
    Keyboard.dismiss();
    sendFromDock(t);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [inputText, coach.isBusy, sendFromDock]);

  const handleNativeChangeText = useCallback((e: { nativeEvent: { text: string } }) => {
    setInputText(e.nativeEvent.text);
  }, []);

  const handleNativeSubmit = useCallback(
    (_e: { nativeEvent: { text: string } }) => {
      handleSendMessage();
    },
    [handleSendMessage],
  );

  const handleNativeHeightChange = useCallback((e: { nativeEvent: { height: number } }) => {
    setInputHeight(e.nativeEvent.height);
  }, []);

  // Dynamic bottom padding for scroll content
  // insets.bottom already includes tab bar height (translucent NativeTabs)
  const bottomBarHeight =
    (coach.taskBarVisible ? 44 : 0) + inputHeight + 16 + insets.bottom;

  const greetingTop = insets.top + 44;
  const greetingHeight = Math.max(windowHeight - greetingTop - bottomBarHeight, 100);

  return (
    <View style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}>
      {/* Native toolbar menu */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis.circle">
          <Stack.Toolbar.MenuAction
            icon="plus.bubble"
            onPress={handleNewConversation}
          >
            {tr("开始新对话", "New conversation")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="list.bullet"
            onPress={handleViewAll}
          >
            {tr("查看所有对话", "All conversations")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="trash"
            destructive
            onPress={handleDeleteCurrent}
          >
            {tr("删除当前对话", "Delete conversation")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      {/* Messages ScrollView — always rendered */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: bottomBarHeight,
          paddingTop: 6,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        onContentSizeChange={handleContentSizeChange}
      >
        {realMessages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {showThinking && <ThinkingBubble />}
      </ScrollView>

      {/* Greeting — absolutely positioned with explicit height */}
      {showGreeting && !showThinking && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: greetingTop,
            left: 0,
            right: 0,
            height: greetingHeight,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Text style={{
            fontSize: 17,
            color: colors.textSecondary,
            fontFamily: theme.fonts.regular,
            textAlign: "center",
            lineHeight: 24,
          }}>
            {tr(
              "我是你的教练 Paddi，有什么可以帮你？",
              "I'm your coach Paddi.\nHow can I help you today?",
            )}
          </Text>
        </View>
      )}

      {/* Bottom input area — floats above tab bar with scroll edge effect */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        keyboardVerticalOffset={0}
      >
        <View ref={bottomBarRef} style={{ paddingBottom: insets.bottom + 12 }}>
          {/* TaskBar — flow layout */}
          <TaskBar currentMode={mode} onToggleMode={handleToggleMode} visible={coach.taskBarVisible} />

          {/* Input bar — glass pill matching tab bar material */}
          <View
            style={{
              borderRadius: 22,
              overflow: "hidden",
              marginHorizontal: 14,
              borderWidth: inputFocused ? 0.8 : 0.3,
              borderColor: inputFocused ? colors.accent : colors.border,
              height: inputHeight,
            }}
          >
            {Platform.OS === "ios" && (
              <GlassView
                glassEffectStyle="regular"
                isInteractive
                colorScheme="auto"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            )}
            {Platform.OS === "ios" ? (
              <NativeTextView
                style={{ flex: 1 }}
                text={inputText}
                placeholder="Ask Paddi"
                maxHeight={110}
                submitOnReturn
                returnKeyType="send"
                fontSize={15}
                textColor={colors.textPrimary}
                tintColor={colors.accent}
                onChangeText={handleNativeChangeText}
                onSubmitEditing={handleNativeSubmit}
                onHeightChange={handleNativeHeightChange}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />
            ) : (
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask Paddi"
                placeholderTextColor={colors.textTertiary}
                multiline
                returnKeyType="send"
                submitBehavior="blurAndSubmit"
                onSubmitEditing={handleSendMessage}
                style={{
                  fontFamily: theme.fonts.regular,
                  fontSize: 15,
                  lineHeight: 20,
                  maxHeight: 110,
                  color: colors.textPrimary,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Mode detail overlay */}
      <ModeDetailOverlay
        visible={previewOpen}
        onClose={handleCloseOverlay}
        mode={mode}
        plan={coach.draftPlan}
        planSummary={coach.planSummary}
        recommendedActions={coach.recommendedActions}
      />

      {/* Conversation list */}
      <ConversationListSheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        conversations={coach.conversations}
        currentId={coach.currentConversationId}
        onSelect={switchConversation}
        onDelete={deleteConversation}
      />
    </View>
  );
}
