// src/features/community/events/MineEventChip.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "@/lib/theme";
import type { EventOut } from "./types";

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function MineEventChip({
  item,
  onPress,
}: {
  item: EventOut;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      {/* 图片区 — 预留 Image 接口 */}
      <View style={styles.imageArea} />

      {/* 信息区 */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatDateShort(item.start_at)} · {item.publisher.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 160,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  imageArea: {
    height: 80,
    backgroundColor: "#272727",
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: "#fff",
    lineHeight: 16,
  },
  meta: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.40)",
    marginTop: 3,
  },
});
