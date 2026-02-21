import React from "react";
import { View, Image, StyleSheet, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type GalleryItem = { id: string; uri: string; type: "image" | "video" };

export default function GalleryGrid({
  items,
  onPressItem,
}: {
  items: GalleryItem[];
  onPressItem: (item: GalleryItem) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Pressable key={it.id} style={styles.cell} onPress={() => onPressItem(it)}>
          <Image source={{ uri: it.uri }} style={styles.img} />
          {it.type === "video" ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={12} color="#111" />
              <Text style={styles.videoText}>Video</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  img: { width: "100%", height: "100%" },
  videoBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.75)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  videoText: { fontSize: 11, fontWeight: "800", color: "#111" },
});
