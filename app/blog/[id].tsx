// P2-G — blog post reader (cover + markdown + like/save). Reached from the
// 活动 list (a "资讯/News" card).
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  NATIVE_HEADER_BASE,
  withHeaderTheme,
  HEADER_TRANSPARENT,
} from "@/lib/nativeHeaderOptions";
import { useSettings } from "@/contexts/SettingsContext";
import { blogApi } from "@/features/community/blog/api";
import type { BlogDetail } from "@/features/community/blog/types";

export default function BlogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mdStyles = useMemo(() => markdownStyles(colors), [colors]);
  const { tr } = useSettings();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_BASE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: "",
    });
  }, [navigation, colors]);

  const [post, setPost] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    blogApi
      .getBlog(id)
      .then((p) => {
        if (!alive) return;
        setPost(p);
        setLiked(p.is_liked);
        setSaved(p.is_saved);
      })
      .catch(() => alive && setPost(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  function toggleLike() {
    if (!id) return;
    setLiked((v) => !v);
    blogApi.like(id).catch(() => setLiked((v) => !v));
  }
  function toggleSave() {
    if (!id) return;
    setSaved((v) => !v);
    blogApi.save(id).catch(() => setSaved((v) => !v));
  }

  if (loading) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }
  if (!post) {
    return (
      <View style={[styles.fill, styles.center]}>
        <Text style={styles.muted}>{tr("找不到文章", "Post not found")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {post.cover_url ? (
          <Image source={{ uri: post.cover_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: colors.cardDark }]} />
        )}
        <View style={styles.body}>
          <Text style={styles.title}>{post.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {post.publisher?.name ?? tr("岩馆", "Gym")}
              {post.published_at ? ` · ${post.published_at.slice(0, 10)}` : ""}
            </Text>
          </View>

          {post.content_markdown ? (
            <Markdown style={mdStyles}>{post.content_markdown}</Markdown>
          ) : (
            <Text style={styles.muted}>{tr("暂无内容", "No content")}</Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={toggleLike}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={22}
                color={liked ? "#E24B4A" : colors.textSecondary}
              />
              <Text style={styles.actionText}>{tr("喜欢", "Like")}</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={toggleSave}>
              <Ionicons
                name={saved ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saved ? colors.accent : colors.textSecondary}
              />
              <Text style={styles.actionText}>{tr("收藏", "Save")}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    muted: { fontFamily: theme.fonts.regular, fontSize: 14, color: colors.textSecondary },
    cover: { width: "100%", height: 220 },
    body: { padding: 18 },
    title: { fontFamily: theme.fonts.black, fontSize: 24, color: colors.textPrimary, letterSpacing: -0.5 },
    metaRow: { marginTop: 8, marginBottom: 14 },
    meta: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary },
    actions: { flexDirection: "row", gap: 24, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
    action: { flexDirection: "row", alignItems: "center", gap: 7 },
    actionText: { fontFamily: theme.fonts.bold, fontSize: 14, color: colors.textSecondary },
  });

const markdownStyles = (colors: ReturnType<typeof useThemeColors>) => ({
  body: { color: colors.textPrimary, fontFamily: theme.fonts.regular, fontSize: 16, lineHeight: 26 },
  heading1: { fontFamily: theme.fonts.black, fontSize: 22, color: colors.textPrimary, marginTop: 16, marginBottom: 8 },
  heading2: { fontFamily: theme.fonts.bold, fontSize: 18, color: colors.textPrimary, marginTop: 14, marginBottom: 6 },
  strong: { fontFamily: theme.fonts.bold },
  link: { color: colors.accent },
  bullet_list: { marginVertical: 6 },
});
