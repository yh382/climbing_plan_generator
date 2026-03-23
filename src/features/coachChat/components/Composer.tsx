// src/features/coachChat/components/Composer.tsx
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const NATIVE_TAB_BAR_HEIGHT = 49;

function QuickChip({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.pill,
        backgroundColor: pressed ? colors.border : colors.backgroundSecondary,
        marginRight: 10,
      })}
    >
      <Text
        style={{
          fontFamily: theme.fonts.regular,
          fontSize: 13,
          color: colors.textPrimary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const colors = useThemeColors();

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
      <View style={{ borderTopWidth: 0.8, borderTopColor: colors.border, backgroundColor: "rgba(255,255,255,0.96)", paddingBottom: NATIVE_TAB_BAR_HEIGHT }}>
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
              borderColor: colors.border,
              borderRadius: theme.borderRadius.pill,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: colors.background,
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message AI Coach…"
              placeholderTextColor={colors.textTertiary}
              multiline
              style={{
                fontFamily: theme.fonts.regular,
                fontSize: 15,
                lineHeight: 18,
                maxHeight: 110,
                color: colors.textPrimary,
              }}
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
              backgroundColor: disabled ? colors.backgroundSecondary : colors.cardDark,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="arrow-up" size={20} color={disabled ? colors.textTertiary : "#FFF"} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
