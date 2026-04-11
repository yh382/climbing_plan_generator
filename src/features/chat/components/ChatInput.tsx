import React, { useState } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassView } from "expo-glass-effect";
import { useThemeColors } from "@/lib/useThemeColors";

export default function ChatInput({ onSend, disabled }: { onSend: (text: string) => void; disabled?: boolean }) {
  const colors = useThemeColors();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    onSend(t);
  };

  const hasText = !disabled && !!text.trim();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 10,
      }}
    >
      {/* Input pill with glass background */}
      <View
        style={{
          flex: 1,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: focused ? 0.8 : 0.3,
          borderColor: focused ? colors.accent : colors.border,
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
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={{
            fontSize: 15,
            lineHeight: 18,
            maxHeight: 110,
            color: colors.textPrimary,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          onSubmitEditing={submit}
          blurOnSubmit={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      {/* Send button with glass background */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: hasText ? 0 : (focused ? 0.8 : 0.3),
          borderColor: focused ? colors.accent : colors.border,
        }}
      >
        {Platform.OS === "ios" && !hasText && (
          <GlassView
            glassEffectStyle="regular"
            isInteractive
            colorScheme="auto"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        )}
        <Pressable
          onPress={submit}
          disabled={!hasText}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hasText ? colors.accent : "transparent",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="arrow-up" size={20} color={hasText ? "#FFF" : colors.textTertiary} />
        </Pressable>
      </View>
    </View>
  );
}
