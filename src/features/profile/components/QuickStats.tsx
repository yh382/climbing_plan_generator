// src/features/profile/QuickStats.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";

type Props = {
  // data / loading 现在不再使用，但保留类型以兼容调用方
  data?: { count_total: number; best_grade_label?: string | null };
  loading?: boolean;
  homeGymName?: string | null;
  onPressHomeGym?: () => void;
};

export function QuickStats({ homeGymName, onPressHomeGym }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <Pressable
        onPress={onPressHomeGym}
        style={{
          backgroundColor: "#f3f4f6",
          padding: 12,
          borderRadius: 12,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#6b7280" }}>Home Gym</Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
          {homeGymName && homeGymName.trim() !== "" ? homeGymName : "未设置"}
        </Text>
      </Pressable>
    </View>
  );
}



