import React, { useEffect, useRef } from "react";
import { FlatList, Text, View } from "react-native";

import type { ChatMessage } from "../types";
import CollapsiblePlanPreview from "../components/CollapsiblePlanPreview";
import StepChips from "../components/StepChips";
import MessageBubble from "../components/MessageBubble";
import { useCoachChatStore } from "../state/coachChatStore";

export default function CoachChatScreen() {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const coach = useCoachChatStore((s) => s.state);
  const reset = useCoachChatStore((s) => s.reset);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [coach.messages.length]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F6F7F8" }}>
      {/* ✅ Large title area：对齐 Home / Calendar 的大标题视觉（位置和留白接近） */}
      <View style={{ paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 34, fontWeight: "900", color: "#111827" }}>Coach</Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: "#6B7280" }}>
          Chat to build your plan • Live preview
        </Text>
      </View>

      {/* Preview */}
      <CollapsiblePlanPreview plan={coach.draftPlan} />

      {/* Step chips */}
      <StepChips step={coach.step} />

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={coach.messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble msg={item} />}
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 120 }} // ✅ 留出 dock 输入框空间
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* 注意：Composer 已移动到 TabBar Dock，所以这里不再渲染 */}
      {/* 你如果想加一个“重置”按钮，可以放在 Preview 里或消息区插一条系统消息 */}
    </View>
  );
}
