// src/features/coachChat/components/Composer.tsx
import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 0.8,
        borderColor: "#E5E7EB",
        backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
        marginRight: 10,
      })}
    >
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#374151" }}>{label}</Text>
    </Pressable>
  );
}

export default function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");

  const quick = useMemo(
    () => [
      { label: "Easier", v: "Make it easier." },
      { label: "Harder", v: "Make it harder." },
      { label: "Swap exercise", v: "Swap an exercise in the main block." },
      { label: "Why this?", v: "Explain why this exercise/block is chosen." },
      { label: "Risk", v: "Any risks or form cues I should know?" },
      { label: "45min", v: "I only have 45 minutes per session." },
    ],
    []
  );

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    setText("");
    onSend(t);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ borderTopWidth: 0.8, borderTopColor: "#E5E7EB", backgroundColor: "rgba(255,255,255,0.96)" }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}
        >
          {quick.map((q) => (
            <QuickChip key={q.label} label={q.label} onPress={() => onSend(q.v)} />
          ))}
        </ScrollView>

        <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}>
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
              placeholder="Message AI Coach…"
              multiline
              style={{ fontSize: 15, lineHeight: 18, maxHeight: 110 }}
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={disabled}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: disabled ? "#E5E7EB" : "#111827",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="arrow-up" size={20} color={disabled ? "#9CA3AF" : "#FFF"} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
