// src/features/coachChat/components/StepChips.tsx
import React from "react";
import { ScrollView, Text, View } from "react-native";
import type { CoachStep } from "../types";

function Chip({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 0.8,
        borderColor: active ? "#306E6F" : "#E5E7EB",
        backgroundColor: active ? "rgba(48,110,111,0.12)" : "#FFFFFF",
        marginRight: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "800", color: active ? "#306E6F" : "#6B7280" }}>
        {done ? "✓" : "•"}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: "800", color: active ? "#306E6F" : "#6B7280" }}>
        {label}
      </Text>
    </View>
  );
}

export default function StepChips({ step }: { step: CoachStep }) {
  const items: { s: CoachStep; zh: string; en: string }[] = [
    { s: 1, zh: "收集信息", en: "Collect" },
    { s: 2, zh: "生成草案", en: "Draft" },
    { s: 3, zh: "匹配动作", en: "Match" },
    { s: 4, zh: "排课进阶", en: "Schedule" },
    { s: 5, zh: "确认发布", en: "Publish" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
    >
      {items.map((it) => (
        <Chip key={it.s} label={it.en} active={it.s === step} done={it.s < step} />
      ))}
    </ScrollView>
  );
}
