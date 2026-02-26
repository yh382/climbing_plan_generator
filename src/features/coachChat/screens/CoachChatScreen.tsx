import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Keyboard, Pressable, Text, View } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import type { ChatMessage } from "../types";
import CollapsiblePlanPreview from "../components/CollapsiblePlanPreview";
import PhaseIndicator from "../components/PhaseIndicator";
import PlanPreviewOverlay from "../components/PlanPreviewOverlay";
import ConversationMenuSheet from "../components/ConversationMenuSheet";
import ConversationListSheet from "../components/ConversationListSheet";
import MessageBubble from "../components/MessageBubble";
import { useCoachChatStore } from "../state/coachChatStore";

export default function CoachChatScreen() {
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const menuSheetRef = useRef<BottomSheet>(null);
  const listSheetRef = useRef<BottomSheet>(null);

  const [previewOpen, setPreviewOpen] = useState(false);

  const coach = useCoachChatStore((s) => s.state);
  const createConversation = useCoachChatStore((s) => s.createConversation);
  const deleteConversation = useCoachChatStore((s) => s.deleteConversation);
  const switchConversation = useCoachChatStore((s) => s.switchConversation);
  const setOverlayOpen = useCoachChatStore((s) => s.setOverlayOpen);

  // Auto-scroll on new messages
  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [coach.messages.length]);

  // Layer mutual exclusion: close sheets when overlay opens
  const handleOpenOverlay = useCallback(() => {
    menuSheetRef.current?.close();
    listSheetRef.current?.close();
    Keyboard.dismiss();
    setPreviewOpen(true);
    setOverlayOpen(true);
  }, [setOverlayOpen]);

  const handleCloseOverlay = useCallback(() => {
    setPreviewOpen(false);
    setOverlayOpen(false);
  }, [setOverlayOpen]);

  const handleOpenMenu = useCallback(() => {
    menuSheetRef.current?.snapToIndex(0);
  }, []);

  const handleNewConversation = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleViewAll = useCallback(() => {
    listSheetRef.current?.snapToIndex(0);
  }, []);

  const handleDeleteCurrent = useCallback(() => {
    if (coach.currentConversationId) {
      deleteConversation(coach.currentConversationId);
    }
  }, [coach.currentConversationId, deleteConversation]);

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
            Chat to build your plan • Live preview
          </Text>
        </View>
        <Pressable onPress={handleOpenMenu} hitSlop={12} style={{ paddingBottom: 4 }}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#6B7280" />
        </Pressable>
      </View>

      {/* Phase indicator */}
      <PhaseIndicator phase={coach.phase} />

      {/* Plan preview (fixed height) */}
      <CollapsiblePlanPreview plan={coach.draftPlan} onExpand={handleOpenOverlay} />

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={coach.messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 120 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!previewOpen}
        style={{ flex: 1 }}
      />

      {/* Plan preview overlay (modal) */}
      <PlanPreviewOverlay
        visible={previewOpen}
        onClose={handleCloseOverlay}
        plan={coach.draftPlan}
      />

      {/* Conversation menu */}
      <ConversationMenuSheet
        ref={menuSheetRef}
        onNewConversation={handleNewConversation}
        onViewAll={handleViewAll}
        onDeleteCurrent={handleDeleteCurrent}
      />

      {/* Conversation list */}
      <ConversationListSheet
        ref={listSheetRef}
        conversations={coach.conversations}
        currentId={coach.currentConversationId}
        onSelect={switchConversation}
        onDelete={deleteConversation}
      />
    </View>
  );
}
