import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { ChatMessage } from "../types";
import { useCoachChatStore } from "../state/coachChatStore";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const CHAR_INTERVAL = 5;

export default function MessageBubble({ msg }: { msg: ChatMessage }) {
  const colors = useThemeColors();
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
    <View style={{
      width: "100%",
      paddingHorizontal: 16,
      paddingVertical: isUser ? 6 : 8,
      alignItems: isUser ? "flex-end" : "flex-start",
    }}>
      <Pressable
        onPress={handleTap}
        disabled={!isStreaming}
        style={isUser ? {
          maxWidth: "86%",
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.accent,
        } : {
          maxWidth: "92%",
          paddingHorizontal: 0,
          paddingVertical: 0,
        }}
      >
        <Text style={{
          color: isUser ? "#FFF" : colors.textPrimary,
          lineHeight: isUser ? 18 : 22,
          fontSize: 15,
          fontFamily: theme.fonts.regular,
        }}>
          {displayText}
          {isStreaming && displayLen < msg.text.length ? "\u258C" : ""}
        </Text>
      </Pressable>
    </View>
  );
}
