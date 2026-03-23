import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";

export default function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const colors = useThemeColors();
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
          borderTopColor: colors.border,
          backgroundColor: colors.background,
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            borderWidth: 0.8,
            borderColor: colors.border,
            borderRadius: 18,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.backgroundSecondary,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{ fontSize: 15, lineHeight: 18, maxHeight: 110, color: colors.textPrimary }}
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
            backgroundColor: disabled || !text.trim() ? colors.backgroundSecondary : colors.cardDark,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="arrow-up" size={20} color={disabled || !text.trim() ? colors.textTertiary : "#FFF"} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
