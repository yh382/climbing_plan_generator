// src/features/community/components/FeedPost.tsx

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { FeedPost as FeedPostType, PostAttachment } from "../../../types/community";
import MediaCarousel from "../../../components/shared/MediaCarousel";
import ImageViewer from "../../../components/shared/ImageViewer";
import { PostAttachmentCard } from "../../../components/shared/PostAttachmentCard";

function buildAttachmentProps(att: PostAttachment) {
  if (att.type === "plan") {
    return {
      type: "plan" as const,
      data: {
        name: att.title,
        totalWeeks: att.metrics?.find((m) => m.label === "Weeks")?.value || "—",
        sessionsPerWeek:
          att.metrics?.find((m) => m.label === "Sessions/wk")?.value || "—",
        type: att.metrics?.find((m) => m.label === "Type")?.value || "—",
      },
    };
  }
  return {
    type: "routeLog" as const,
    data: {
      gymName: att.metrics?.find((m) => m.label === "Gym")?.value || "—",
      date: att.metrics?.find((m) => m.label === "Date")?.value || "—",
      sends: att.metrics?.find((m) => m.label === "Sends")?.value || "—",
      bestGrade: att.metrics?.find((m) => m.label === "Best")?.value || "—",
      duration: att.metrics?.find((m) => m.label === "Duration")?.value || "—",
    },
  };
}

const { width } = Dimensions.get("window");

interface Props {
  post: FeedPostType;
  onLike: (id: string) => void;
  onPressAttachment: (post: FeedPostType) => void;
  onPress: (userId: string) => void;
  onPressComment: (id: string) => void;
  onSave: (id: string) => void;
  onThreeDot?: () => void;

  // [新增] 简易模式开关：用于在个人主页隐藏头像用户名
  simpleMode?: boolean;
}

function ExpandableText({
  text,
  numberOfLines = 3,
}: {
  text: string;
  numberOfLines?: number;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const onTextLayout = useMemo(
    () =>
      (e: NativeSyntheticEvent<TextLayoutEventData>) => {
        // Only calculate once (collapsed state)
        if (expanded) return;
        const lines = e.nativeEvent.lines ?? [];
        if (lines.length > numberOfLines) setHasMore(true);
      },
    [expanded, numberOfLines]
  );

  return (
    <View style={styles.textBlock}>
      <Text
        style={styles.contentText}
        numberOfLines={expanded ? undefined : numberOfLines}
        onTextLayout={onTextLayout}
      >
        {text}
      </Text>

      {hasMore ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpanded((v) => !v)}
          style={styles.moreHit}
        >
          <Text style={styles.moreText}>{expanded ? "less" : "… more"}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}


export default function FeedPost({
  post,
  onLike,
  onPressAttachment,
  onPress,
  onPressComment,
  onSave,
  onThreeDot,
  simpleMode = false, // 默认为 false
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  return (
    <View style={[styles.container, simpleMode && styles.containerSimple]}>
      {/* 1. Header 逻辑分支 */}
      {simpleMode ? (
        // [新增] 简易模式 Header：只显示时间地点
        <View style={styles.simpleHeader}>
          <Text style={styles.time}>
            {new Date(post.timestamp).toLocaleDateString()} · {post.user?.homeGym || "Climber"}
          </Text>
        </View>
      ) : (
        // 原版 Header：显示头像用户名
        <TouchableOpacity style={styles.header} onPress={() => onPress(post.user.id)} activeOpacity={0.7}>
          {post.user.avatar ? (
            <Image source={{ uri: post.user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={18} color={colors.textTertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.username}>{post.user.username}</Text>
            <Text style={styles.time}>
              {new Date(post.timestamp).toLocaleDateString()} · {post.user?.homeGym || "Climber"}
            </Text>
            {post.gymName && (
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: '/(tabs)/community',
                  params: { tab: 'gyms', gymId: post.gymId },
                })}
                style={styles.gymTag}
                activeOpacity={0.7}
              >
                <Ionicons name="location" size={11} color={colors.textTertiary} />
                <Text style={styles.gymTagText}>{post.gymName}</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={{ padding: 4 }} onPress={onThreeDot}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* 2. Images / Video — carousel with full-screen viewer */}
      {post.images && post.images.length > 0 ? (
        <View style={styles.mediaBlock}>
          <MediaCarousel
            images={post.images}
            width={width}
            height={width}
            onPressImage={openViewer}
          />
          {post.images.length > 1 && (
            <View style={styles.mediaBadge}>
              <Text style={styles.mediaBadgeText}>+{post.images.length - 1}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* 3. Attachment (shared card) - 图片下面 */}
      {post.attachment ? (
        <View style={styles.attachmentBlock}>
          <PostAttachmentCard
            {...buildAttachmentProps(post.attachment)}
            onPress={() => onPressAttachment(post)}
          />
        </View>
      ) : null}

      {/* 4. Text (below card, expandable) - 卡片下面 */}
      {post.content ? <ExpandableText text={post.content} numberOfLines={3} /> : null}

      {/* 5. Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.iconRow} onPress={() => onLike(post.id)}>
          <Ionicons
            name={post.isLiked ? "heart" : "heart-outline"}
            size={22}
            color={post.isLiked ? "#EF4444" : colors.textPrimary}
          />
          <Text style={styles.iconText}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconRow} onPress={() => onPressComment(post.id)}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.iconText}>{post.comments}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => onSave(post.id)}>
          <Ionicons name={post.isSaved ? "bookmark" : "bookmark-outline"} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Full-screen image viewer modal */}
      {post.images && post.images.length > 0 && (
        <ImageViewer
          images={post.images}
          initialIndex={viewerIndex}
          visible={viewerVisible}
          onClose={() => setViewerVisible(false)}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: colors.background,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  containerSimple: {
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 16,
  },

  header: { flexDirection: "row", alignItems: "center", padding: 16 },
  simpleHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundSecondary },
  headerText: { flex: 1, marginLeft: 12 },
  username: { fontSize: 15, fontWeight: "700", fontFamily: theme.fonts.bold, color: colors.textPrimary },
  time: { fontSize: theme.typography.caption.fontSize, fontFamily: theme.fonts.regular, color: colors.textTertiary },

  mediaBlock: { marginBottom: 12 },
  attachmentBlock: { paddingHorizontal: 16, marginBottom: 10 },

  // Expandable text
  textBlock: { paddingHorizontal: 16, marginBottom: 12 },
  contentText: { fontSize: theme.typography.body.fontSize, lineHeight: 22, fontFamily: theme.fonts.regular, color: colors.textPrimary },
  moreHit: { alignSelf: "flex-start", paddingTop: 6, paddingBottom: 2 },
  moreText: { fontSize: 13, fontWeight: "700", fontFamily: theme.fonts.bold, color: colors.textSecondary },

  // Media badge
  mediaBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  mediaBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  footer: { flexDirection: "row", paddingHorizontal: 16, marginTop: 4, alignItems: "center", gap: 20 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconText: { fontSize: 13, fontWeight: "600", fontFamily: theme.fonts.medium, color: colors.textSecondary },

  gymTag: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  gymTagText: { fontSize: 12, fontFamily: theme.fonts.regular, color: colors.textSecondary },
});
