import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BlogPost } from "./mockBlogs";

export function BlogCard({
  post,
  onPress,
}: {
  post: BlogPost;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
      <View style={styles.cover}>
        {/* 预留 image 接口：后续替换为 <Image/> 即可 */}
        <View style={styles.coverIcon}>
          <Ionicons name="home" size={18} color="#111" />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {post.publishedAt}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.metaText} numberOfLines={1}>
            {post.author}
          </Text>
        </View>

        {post.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {post.excerpt}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    overflow: "hidden",
    marginBottom: 12,
  },
  cover: {
    height: 140,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  coverIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.12)",
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111",
    lineHeight: 22,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 8,
  },
  excerpt: {
    marginTop: 8,
    fontSize: 14,
    color: "#374151",
    lineHeight: 19,
  },
});
