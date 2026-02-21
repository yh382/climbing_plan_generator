import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";

import useLogsStore from "../../store/useLogsStore";

type Props = {
  style?: any;
  variant?: "floating" | "inline";
};

const TAB_H = 60; // 与 SplitFloatingTabBar H 一致
const TAB_W = 72; // 与 BTN 一致
const RADIUS = 32;

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export default function ActiveSessionFloat({ style, variant = "floating" }: Props) {
  const router = useRouter();
  const { activeSession } = useLogsStore();
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!activeSession) return;
    const update = () => setElapsedMs(Date.now() - activeSession.startTime);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  if (!activeSession) return null;

  const totalSec = Math.floor(elapsedMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const topText = h >= 1 ? pad2(h) : pad2(m);
  const bottomText = h >= 1 ? pad2(m) : pad2(s);

  const handlePress = () => router.push("/journal");

  // Inline 仍然保持原逻辑
  if (variant === "inline") {
    return (
      <TouchableOpacity style={[styles.inlineContainer, style]} onPress={handlePress} activeOpacity={0.8}>
        <View style={styles.liveDot} />
        <Text style={styles.inlineText}>{`${pad2(h)}:${pad2(m)}:${pad2(s)}`}</Text>
        <Ionicons name="chevron-forward" size={14} color="#FFF" style={{ opacity: 0.6, marginLeft: 4 }} />
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(40)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.floatingOuter, style]}
    >
      <TouchableOpacity style={styles.floatingContent} onPress={handlePress} activeOpacity={0.9}>
        <View style={styles.liveDot} />

        <View style={styles.twoLineCol}>
          <Text style={styles.timeTop}>{topText}</Text>
          <Text style={styles.timeBottom}>{bottomText}</Text>
        </View>

        <Ionicons name="chevron-forward" size={12} color="#E5E7EB" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* Inline（不变） */
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1220",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inlineText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },

  /* Floating（深色 + 对齐 TabBar） */
  floatingOuter: {
    width: TAB_W,
    height: TAB_H,
    borderRadius: RADIUS,
    backgroundColor: "#0F172A", // ✅ 原来的深色背景
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: "hidden",
  },
  floatingContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8, // ✅ 紧凑
    gap: 6,
  },

  twoLineCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  timeTop: {
    color: "#F9FAFB",
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 12,
    fontVariant: ["tabular-nums"],
  },
  timeBottom: {
    color: "#E5E7EB",
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 12,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
});
