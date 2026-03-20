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
import { FeedPost as FeedPostType, PostAttachment } from "../../../types/community";
import MediaCarousel from "../../../components/shared/MediaCarousel";
import ImageViewer from "../../../components/shared/ImageViewer";

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

// 附件组件保持不变
const AttachmentCard = ({
  attachment,
  onPress,
}: {
  attachment: PostAttachment;
  onPress: () => void;
}) => {
  const getStyle = () => {
    switch (attachment.type) {
      case "shared_plan":
        return { color: "#4F46E5", icon: "flash", label: "SHARED PLAN" };
      case "finished_session":
        return { color: "#10B981", icon: "checkmark-done", label: "WORKOUT RECORD" };
      case "log":
        return { color: "#0EA5E9", icon: "trophy", label: "CLIMBING LOG" };
      default:
        return { color: "#6B7280", icon: "document", label: "ATTACHMENT" };
    }
  };

  const styleConfig = getStyle();

  return (
    <TouchableOpacity style={styles.attachContainer} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.attachBar, { backgroundColor: styleConfig.color }]} />
      <View style={styles.attachContent}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name={styleConfig.icon as any} size={14} color={styleConfig.color} />
            <Text style={[styles.attachLabel, { color: styleConfig.color }]}>{styleConfig.label}</Text>
          </View>
          <Text style={styles.attachTitle} numberOfLines={1}>
            {attachment.title}
          </Text>
          <Text style={styles.attachSub} numberOfLines={1}>
            {attachment.subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );
};

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
            <View style={[styles.avatar, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={18} color="#9CA3AF" />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.username}>{post.user.username}</Text>
            <Text style={styles.time}>
              {new Date(post.timestamp).toLocaleDateString()} · {post.user?.homeGym || "Climber"}
            </Text>
          </View>
          <TouchableOpacity style={{ padding: 4 }} onPress={onThreeDot}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
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
        </View>
      ) : null}

      {/* 3. Attachment (shared card) - 图片下面 */}
      {post.attachment ? (
        <View style={styles.attachmentBlock}>
          <AttachmentCard attachment={post.attachment} onPress={() => onPressAttachment(post)} />
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
            color={post.isLiked ? "#EF4444" : "#111"}
          />
          <Text style={styles.iconText}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconRow} onPress={() => onPressComment(post.id)}>
          <Ionicons name="chatbubble-outline" size={20} color="#111" />
          <Text style={styles.iconText}>{post.comments}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => onSave(post.id)}>
          <Ionicons name={post.isSaved ? "bookmark" : "bookmark-outline"} size={20} color="#111" />
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    backgroundColor: "#FFF",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  // 简易模式下，去掉底部粗分割线，改用细线或者无边框，这里稍微减小 margin
  containerSimple: {
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 16,
  },

  header: { flexDirection: "row", alignItems: "center", padding: 16 },
  simpleHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }, // 简易头部

  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6" },
  headerText: { flex: 1, marginLeft: 12 },
  username: { fontSize: 15, fontWeight: "700", color: "#111" },
  time: { fontSize: 12, color: "#9CA3AF" },

  // ✅ 新布局块
  mediaBlock: { marginBottom: 12 },
  attachmentBlock: { paddingHorizontal: 16, marginBottom: 10 },

  // Expandable text
  textBlock: { paddingHorizontal: 16, marginBottom: 12 },
  contentText: { fontSize: 15, lineHeight: 22, color: "#374151" },
  moreHit: { alignSelf: "flex-start", paddingTop: 6, paddingBottom: 2 },
  moreText: { fontSize: 13, fontWeight: "700", color: "#111" },

  // Attachment
  attachContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  attachBar: { width: 6 },
  attachContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    justifyContent: "space-between",
  },
  attachLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  attachTitle: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 2 },
  attachSub: { fontSize: 12, color: "#6B7280" },


  footer: { flexDirection: "row", paddingHorizontal: 16, marginTop: 4, alignItems: "center", gap: 20 },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconText: { fontSize: 13, fontWeight: "600", color: "#4B5563" },
});
