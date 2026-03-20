import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    onSend(t);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderTopWidth: 0.8,
          borderTopColor: "#E5E7EB",
          backgroundColor: "rgba(255,255,255,0.96)",
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            borderWidth: 0.8,
            borderColor: "#E5E7EB",
            borderRadius: 18,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: "#FFFFFF",
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            multiline
            style={{ fontSize: 15, lineHeight: 18, maxHeight: 110 }}
            onSubmitEditing={submit}
            blurOnSubmit={false}
          />
        </View>

        <Pressable
          onPress={submit}
          disabled={disabled || !text.trim()}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: disabled || !text.trim() ? "#E5E7EB" : "#111827",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="arrow-up" size={20} color={disabled || !text.trim() ? "#9CA3AF" : "#FFF"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
