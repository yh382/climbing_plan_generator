import React, { useLayoutEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { BlogSearchBar } from "./component/BlogSearchBar";
import { BlogCard } from "./component/BlogCard";
import { MOCK_BLOGS } from "./component/mockBlogs";
import { useThemeColors } from "@/lib/useThemeColors";

export default function BlogListScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();

  const [q, setQ] = useState("");

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      title: "Blog",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, router, colors]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return MOCK_BLOGS;

    return MOCK_BLOGS.filter((p) => {
      const hay = [
        p.title,
        p.author,
        p.publishedAt,
        p.excerpt ?? "",
        ...(p.tags ?? []),
        ...p.content.map((c) => ("text" in c ? c.text : "")),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(key);
    });
  }, [q]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Search bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, marginBottom: 14 }}>
        <BlogSearchBar value={q} onChange={setQ} placeholder="Search by keyword" />
      </View>

      {/* List */}
      <View style={{ paddingHorizontal: 16 }}>
        {filtered.map((post) => (
          <BlogCard
            key={post.id}
            post={post}
            onPress={() => router.push({ pathname: "/blog/[blogId]", params: { blogId: post.id } })}
          />
        ))}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search" size={18} color="#6B7280" />
            <Text style={styles.emptyText}>No results</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  empty: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
  },
});
