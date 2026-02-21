// CoachDockComposer.tsx

import React, { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CoachDockComposer({
  expanded,
  onSend,
}: {
  expanded: boolean;
  onSend: (t: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");

  const placeholder = useMemo(() => (expanded ? "Message AI Coach…" : ""), [expanded]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    onSend(t);
  };

  return (
    <View
      style={{
        height: 50,
        borderRadius: 25,
        paddingHorizontal: 12,
        // ✅ 修复：背景改为透明，去掉边框，使其融入父级 BlurView
        backgroundColor: "transparent", 
        borderWidth: 0, 
        // borderColor: "rgba(0,0,0,0.06)", // 也可以删掉
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#6B7280" // 稍微加深一点 placeholder 颜色以适应透明背景
        style={{
          flex: 1,
          fontSize: 15,
          paddingVertical: 10,
          color: "#111827",
        }}
        editable={expanded}
        returnKeyType="send"
        onSubmitEditing={submit}
      />

      <Pressable
        onPress={submit}
        disabled={!expanded}
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 19,
          // 如果需要保持按钮的深色背景：
          backgroundColor: expanded ? "#111827" : "transparent",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Ionicons name="arrow-up" size={18} color={expanded ? "#FFF" : "transparent"} />
      </Pressable>
    </View>
  );
}