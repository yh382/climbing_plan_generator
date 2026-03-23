import React from "react";
import { Text, View } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";
import type { ChatMessageOut } from "../types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatBubble({ message, isMe }: { message: ChatMessageOut; isMe: boolean }) {
  const colors = useThemeColors();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 4, alignItems: isMe ? "flex-end" : "flex-start" }}>
      <View
        style={{
          maxWidth: "80%",
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: isMe ? colors.accent : colors.bubbleAI,
          borderWidth: isMe ? 0 : 0.8,
          borderColor: isMe ? "transparent" : colors.bubbleAIBorder,
        }}
      >
        <Text style={{ color: isMe ? "#FFF" : colors.bubbleAIText, fontSize: 15, lineHeight: 20 }}>
          {message.content}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: isMe ? "rgba(255,255,255,0.6)" : colors.textSecondary,
            marginTop: 4,
            alignSelf: isMe ? "flex-end" : "flex-start",
          }}
        >
          {formatTime(message.created_at)}
          {isMe && message.read_at ? "  Read" : ""}
        </Text>
      </View>
    </View>
  );
}
