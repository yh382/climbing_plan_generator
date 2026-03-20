import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Keyboard, Text, View } from "react-native";
import GlassIconButton from "../../community/challenges/component/GlassIconButton";

import type { ChatMessage, CoachMode } from "../types";
import ModeIndicator from "../components/ModeIndicator";
import ModeDetailOverlay from "../components/ModeDetailOverlay";
import ConversationMenuSheet from "../components/ConversationMenuSheet";
import ConversationListSheet from "../components/ConversationListSheet";
import TaskBar from "../components/TaskBar";
import MessageBubble from "../components/MessageBubble";
import ThinkingBubble from "../components/ThinkingBubble";
import { useCoachChatStore } from "../state/coachChatStore";
import { useSettings } from "../../../contexts/SettingsContext";

const MODE_STARTER_PROMPTS: Record<Exclude<CoachMode, "none">, { zh: string; en: string }> = {
  plan: { zh: "帮我制定一个训练计划", en: "Help me create a training plan" },
  actions: { zh: "根据我的数据推荐训练动作", en: "Recommend exercises based on my data" },
  analysis: { zh: "分析我最近的训练数据", en: "Analyze my recent training data" },
};

export default function CoachChatScreen() {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const coach = useCoachChatStore((s) => s.state);
  const createConversation = useCoachChatStore((s) => s.createConversation);
  const deleteConversation = useCoachChatStore((s) => s.deleteConversation);
  const switchConversation = useCoachChatStore((s) => s.switchConversation);
  const sendFromDock = useCoachChatStore((s) => s.sendFromDock);
  const loadConversations = useCoachChatStore((s) => s.loadConversations);
  const setOverlayOpen = useCoachChatStore((s) => s.setOverlayOpen);
  const setMode = useCoachChatStore((s) => s.setMode);

  const { tr } = useSettings();

  // Load conversations from backend on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const mode = coach.mode;

  // i18n seed message: only replace text, keep id/ts stable
  const localizedMessages = useMemo(() => {
    if (coach.messages.length === 0) return coach.messages;
    const first = coach.messages[0];
    if (!first.id.startsWith("seed") && first.id !== "seed-1") return coach.messages;

    const localizedText = tr(
      "Hi，我是 paddi🦍 你想做什么：制定计划 / 找动作 / 总结训练？还是只是想聊聊任何攀岩相关的话题？",
      "Hi, I'm Paddi 🦍 What would you like to do: plan / actions / training summary — or just chat about anything climbing-related?",
    );
    if (first.text === localizedText) return coach.messages;

    return [{ ...first, text: localizedText }, ...coach.messages.slice(1)];
  }, [coach.messages, tr]);

  const showThinking = coach.isBusy && !coach.streamingMsgId;

  // Auto-scroll on new messages and streaming transitions
  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [localizedMessages.length, coach.streamingMsgId]);

  // Layer mutual exclusion: close modals when overlay opens
  const handleOpenOverlay = useCallback(() => {
    setMenuOpen(false);
    setListOpen(false);
    Keyboard.dismiss();
    setPreviewOpen(true);
    setOverlayOpen(true);
  }, [setOverlayOpen]);

  const handleCloseOverlay = useCallback(() => {
    setPreviewOpen(false);
    setOverlayOpen(false);
  }, [setOverlayOpen]);

  // ⋯ menu
  const handleOpenMenu = useCallback(() => {
    if (previewOpen) {
      setPreviewOpen(false);
      setOverlayOpen(false);
    }
    setMenuOpen(true);
  }, [previewOpen, setOverlayOpen]);

  const handleNewConversation = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleViewAll = useCallback(() => {
    setMenuOpen(false);
    setListOpen(true);
  }, []);

  const handleDeleteCurrent = useCallback(() => {
    if (coach.currentConversationId) {
      deleteConversation(coach.currentConversationId);
    }
  }, [coach.currentConversationId, deleteConversation]);

  const handleToggleMode = useCallback(
    (m: CoachMode) => {
      const prevMode = useCoachChatStore.getState().state.mode;
      setMode(m);

      // Auto-send starter prompt when activating a mode (not deactivating)
      if (m !== "none" && prevMode === "none" && !useCoachChatStore.getState().state.isBusy) {
        const prompt = MODE_STARTER_PROMPTS[m];
        sendFromDock(tr(prompt.zh, prompt.en));
      }
    },
    [setMode, sendFromDock, tr],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F7F8" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: 54,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ fontSize: 34, fontWeight: "900", color: "#111827" }}>Coach</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: "#6B7280" }}>
            {tr("对话制定你的训练计划", "Chat to build your plan")}
          </Text>
        </View>
        <GlassIconButton icon="ellipsis-horizontal" onPress={handleOpenMenu} />
      </View>

      {/* Mode indicator — compact bar, clickable to expand */}
      {mode !== "none" && (
        <ModeIndicator mode={mode} phase={coach.phase} onExpand={handleOpenOverlay} />
      )}

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={localizedMessages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        ListFooterComponent={showThinking ? <ThinkingBubble /> : null}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 164 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!previewOpen}
        style={{ flex: 1 }}
      />

      {/* Task bar — fixed above dock, fades away after mode selection or first message */}
      <TaskBar currentMode={mode} onToggleMode={handleToggleMode} visible={coach.taskBarVisible} />

      {/* Mode detail overlay (modal) */}
      <ModeDetailOverlay
        visible={previewOpen}
        onClose={handleCloseOverlay}
        mode={mode}
        plan={coach.draftPlan}
        planSummary={coach.planSummary}
        recommendedActions={coach.recommendedActions}
      />

      {/* Conversation menu */}
      <ConversationMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewConversation={handleNewConversation}
        onViewAll={handleViewAll}
        onDeleteCurrent={handleDeleteCurrent}
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
