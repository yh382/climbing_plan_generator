// src/features/coachChat/components/MessageBubble.tsx
import React from "react";
import { Text, View } from "react-native";
import type { ChatMessage } from "../types";

export default function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: isUser ? "flex-end" : "flex-start" }}>
      <View
        style={{
          maxWidth: "86%",
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: isUser ? "#306E6F" : "#FFFFFF",
          borderWidth: isUser ? 0 : 0.8,
          borderColor: isUser ? "transparent" : "#E5E7EB",
        }}
      >
        <Text style={{ color: isUser ? "#FFF" : "#111827", lineHeight: 18 }}>{msg.text}</Text>
      </View>
    </View>
  );
}
