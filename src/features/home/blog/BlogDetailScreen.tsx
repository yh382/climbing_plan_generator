import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

import { GlassTopBar } from "./component/GlassTopBar";
import { MOCK_BLOGS } from "./component/mockBlogs";
import { GlassIconButton } from "./component/GlassTopBar";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const SCROLL_THRESHOLD = 40;

export default function BlogDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { blogId } = useLocalSearchParams<{ blogId: string }>();

  const post = useMemo(() => MOCK_BLOGS.find((p) => p.id === blogId) ?? MOCK_BLOGS[0], [blogId]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const bigHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
    ],
  }));

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.title} — ${post.author}`,
      });
    } catch {
      // ignore
    }
  };

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
        right={
            <GlassIconButton onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#111" />
            </GlassIconButton>
        }
        />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        // [修改] paddingTop 改为 insets.top + 60，避开顶部导航栏高度
        contentContainerStyle={{ paddingTop: insets.top + 60, paddingBottom: 120 }}
      >
        {/* 大标题区 */}
        <View style={styles.headerRow}>
          <Animated.View style={[styles.bigHeaderArea, bigHeaderStyle]}>
            <Text style={styles.title}>{post.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{post.publishedAt}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaText}>{post.author}</Text>
            </View>
          </Animated.View>
          {/* 这里原本是用来占位的，现在由于有了 paddingTop，其实这个占位View的作用主要是为了右侧不顶到边，或者可以保留 */}
          <View style={{ width: 40 }} />
        </View>

        {/* cover — full bleed, no border radius */}
        <View style={{ marginTop: 8 }}>
          <View style={styles.cover}>
            <View style={styles.coverIcon}>
              <Ionicons name="home" size={18} color={colors.textPrimary} />
            </View>
          </View>
        </View>

        {/* 正文 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          {post.content.map((block, idx) => {
            if (block.type === "h2") {
              return (
                <Text key={idx} style={styles.h2}>
                  {block.text}
                </Text>
              );
            }

            if (block.type === "img") {
              return (
                <View key={idx} style={{ marginTop: 16, marginBottom: 16, marginHorizontal: -16 }}>
                  <View style={styles.inlineImg}>
                    <View style={styles.inlineImgIcon}>
                      <Ionicons name="image-outline" size={18} color={colors.textPrimary} />
                    </View>
                  </View>
                  {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
                </View>
              );
            }

            return (
              <Text key={idx} style={styles.p}>
                {block.text}
              </Text>
            );
          })}
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
    justifyContent: "space-between",
  },
  bigHeaderArea: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
    lineHeight: 34,
    letterSpacing: -1,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    ...theme.typography.caption,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textTertiary,
    marginHorizontal: 8,
  },
  cover: {
    height: 200,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  h2: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  p: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 28,
    color: colors.textPrimary,
    fontFamily: theme.fonts.regular,
  },
  inlineImg: {
    height: 200,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  inlineImgIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  caption: {
    marginTop: 8,
    ...theme.typography.caption,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    paddingHorizontal: 16,
  },
});
