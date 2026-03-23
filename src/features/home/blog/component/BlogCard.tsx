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
          <Ionicons name="home" size={18} color="rgba(255,255,255,0.5)" />
        </View>
      </View>

      <View style={styles.info}>
        {post.tags && post.tags.length > 0 ? (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>{post.tags[0]}</Text>
          </View>
        ) : null}

        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>

        {post.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {post.excerpt}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {post.publishedAt}
          </Text>
          <View style={styles.dot} />
          <Text style={styles.metaText} numberOfLines={1}>
            {post.author}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: "#1C1C1E",
  },
  cover: {
    height: 180,
    backgroundColor: "#272727",
    alignItems: "center",
    justifyContent: "center",
  },
  coverIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    padding: 14,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(48,110,111,0.2)",
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#306E6F",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 22,
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 13,
    color: "rgba(255,255,255,0.50)",
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  metaText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 8,
  },
});
