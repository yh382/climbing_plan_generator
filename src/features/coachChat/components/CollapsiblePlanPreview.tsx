// src/features/coachChat/components/CollapsiblePlanPreview.tsx
import React, { useMemo, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import type { DraftPlan } from "../types";
import { Ionicons } from "@expo/vector-icons";

export default function CollapsiblePlanPreview({
  plan,
}: {
  plan: DraftPlan | null;
}) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const height = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [110, 320],
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.timing(anim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const title = plan?.title ?? "Plan Preview";
  const subtitle = plan?.subtitle ?? "Start chatting to generate a plan.";
  const bullets = plan?.bullets ?? ["No draft yet."];

  const rightIcon = useMemo(() => (open ? "chevron-up" : "chevron-down"), [open]);

  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 22,
        borderWidth: 0.8,
        borderColor: "#E5E7EB",
        backgroundColor: "#0B1220",
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <Animated.View style={{ height, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "900" }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 6 }} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          <Ionicons name={rightIcon as any} size={22} color="rgba(255,255,255,0.8)" />
        </View>

        <View style={{ marginTop: 14, gap: 8 }}>
          {bullets.slice(0, open ? 6 : 2).map((b, idx) => (
            <View key={`${idx}-${b}`} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)" }}>•</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", flex: 1 }} numberOfLines={open ? 2 : 1}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        {open && (
          <View
            style={{
              marginTop: 14,
              paddingVertical: 10,
              borderRadius: 16,
              borderWidth: 0.8,
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: "rgba(255,255,255,0.06)",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#FFF", fontWeight: "900" }}>Tap to collapse • Plan updates live</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
