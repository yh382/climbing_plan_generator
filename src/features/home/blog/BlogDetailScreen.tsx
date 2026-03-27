import React, { useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { MOCK_BLOGS } from "./component/mockBlogs";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";

export default function BlogDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const { blogId } = useLocalSearchParams<{ blogId: string }>();

  const post = useMemo(() => MOCK_BLOGS.find((p) => p.id === blogId) ?? MOCK_BLOGS[0], [blogId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.title} — ${post.author}`,
      });
    } catch {
      // ignore
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      title: "Blog",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      headerRight: () => <HeaderButton icon="square.and.arrow.up" onPress={handleShare} />,
    });
  }, [navigation, router, post.title, colors]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Title + Meta */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{post.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{post.publishedAt}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>{post.author}</Text>
        </View>
      </View>

      {/* cover — full bleed, no border radius */}
      <View style={{ marginTop: 8 }}>
        <View style={styles.cover}>
          <View style={styles.coverIcon}>
            <Ionicons name="home" size={18} color={colors.textPrimary} />
          </View>
        </View>
      </View>

      {/* Body */}
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
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
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
