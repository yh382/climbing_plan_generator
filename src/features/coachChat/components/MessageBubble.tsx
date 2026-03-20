import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ChatMessage } from "../types";
import { useCoachChatStore } from "../state/coachChatStore";

const CHAR_INTERVAL = 5;

export default function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const streamingMsgId = useCoachChatStore((s) => s.state.streamingMsgId);
  const clearStreaming = useCoachChatStore((s) => s.clearStreaming);

  const isStreaming = msg.id === streamingMsgId;
  const [displayLen, setDisplayLen] = useState(isStreaming ? 0 : msg.text.length);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Typewriter interval — only increments displayLen, no store calls here
  useEffect(() => {
    if (!isStreaming) {
      setDisplayLen(msg.text.length);
      return;
    }

    setDisplayLen(0);
    intervalRef.current = setInterval(() => {
      setDisplayLen((prev) => {
        const next = prev + 1;
        if (next >= msg.text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return msg.text.length;
        }
        return next;
      });
    }, CHAR_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming, msg.text.length]);

  // Notify store when typewriter finishes — deferred to avoid setState-during-render
  useEffect(() => {
    if (isStreaming && displayLen >= msg.text.length) {
      clearStreaming();
    }
  }, [isStreaming, displayLen, msg.text.length, clearStreaming]);

  const handleTap = () => {
    if (!isStreaming) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplayLen(msg.text.length);
    clearStreaming();
  };

  const displayText = isStreaming ? msg.text.slice(0, displayLen) : msg.text;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 6, alignItems: isUser ? "flex-end" : "flex-start" }}>
      <Pressable
        onPress={handleTap}
        disabled={!isStreaming}
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
        <Text style={{ color: isUser ? "#FFF" : "#111827", lineHeight: 18 }}>
          {displayText}
          {isStreaming && displayLen < msg.text.length ? "\u258C" : ""}
        </Text>
      </Pressable>
    </View>
  );
}
