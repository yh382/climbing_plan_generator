import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { GlassIconButton } from "./component/GlassTopBar";
import { GlassTopBar } from "./component/GlassTopBar";
import { BlogSearchBar } from "./component/BlogSearchBar";
import { BlogCard } from "./component/BlogCard";
import { MOCK_BLOGS } from "./component/mockBlogs";
import { useThemeColors } from "@/lib/useThemeColors";

const SCROLL_THRESHOLD = 40;

export default function BlogListScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [q, setQ] = useState("");

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const bigTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.95], Extrapolate.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
    ],
  }));

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GlassTopBar
        scrollY={scrollY}
        smallTitle="Blog"
        left={
            <GlassIconButton onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111" />
            </GlassIconButton>
        }
        />


      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        // [修改] paddingTop 改为 insets.top + 60，避开顶部导航栏高度
        contentContainerStyle={{
          paddingTop: insets.top + 60,
          paddingBottom: 120,
        }}
      >
        {/* 顶部大标题区 */}
        <View style={styles.headerRow}>
          <Animated.View style={[styles.bigHeaderArea, bigTitleStyle]}>
            <Text style={styles.bigTitle}>Blog</Text>
            <Text style={styles.bigSub}>Climbing knowledge, guides, and updates</Text>
          </Animated.View>
          <View style={{ width: 88 }} />
        </View>

        {/* 搜索栏 */}
        <View style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <BlogSearchBar value={q} onChange={setQ} placeholder="Search by keyword" />
        </View>

        {/* 列表 */}
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
      </Animated.ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bigHeaderArea: {
    flex: 1,
    paddingRight: 12,
  },
  bigTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111",
    letterSpacing: -0.3,
  },
  bigSub: {
    marginTop: 4,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "400",
  },
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
