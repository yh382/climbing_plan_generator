// src/features/profile/components/ProfilePostGrid.tsx

import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import type { FeedPost as FeedPostType } from "../../../types/community";

const { width: SCREEN_W } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const ITEM_SIZE = SCREEN_W / NUM_COLUMNS;
const GAP = 1;

interface ProfilePostGridProps {
  posts: FeedPostType[];
  onPressPost: (post: FeedPostType) => void;
  loading?: boolean;
}

function GridItem({
  post,
  onPress,
  colors,
}: {
  post: FeedPostType;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const hasMedia = post.media && post.media.length > 0;
  const hasAttachment = !!post.attachment;
  const firstMedia = post.media?.[0];
  // For videos: only use thumbUrl (video URL can't render as Image)
  const thumbUri = firstMedia
    ? (firstMedia.type === 'video' ? firstMedia.thumbUrl : firstMedia.url)
    : undefined;

  return (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: colors.backgroundSecondary }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {hasMedia ? (
        <>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={styles.gridImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.gridImage, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="videocam" size={24} color="rgba(255,255,255,0.4)" />
            </View>
          )}
          {/* Multi-media badge */}
          {post.media!.length > 1 && (
            <View style={styles.multiImageBadge}>
              <Ionicons name="copy-outline" size={14} color="#FFF" />
            </View>
          )}
          {/* Attachment type badge — bottom-left */}
          {post.attachment && (
            <View style={styles.attachTypeBadge}>
              <Ionicons
                name={post.attachment.type === "plan" ? "flash" : "trophy-outline"}
                size={10}
                color="#fff"
              />
            </View>
          )}
        </>
      ) : hasAttachment && post.attachment ? (
        <View style={[styles.textCell, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons
            name={
              post.attachment!.type === "plan"
                ? "flash"
                : post.attachment!.type === "session"
                ? "checkmark-done"
                : "trophy"
            }
            size={24}
            color={colors.textTertiary}
          />
          <Text style={[styles.attachTitle, { color: colors.textSecondary }]} numberOfLines={2}>
            {post.attachment!.title}
          </Text>
        </View>
      ) : (
        <View style={[styles.textCell, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.textPreview, { color: colors.textSecondary }]} numberOfLines={4}>
            {post.content}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ProfilePostGrid({
  posts,
  onPressPost,
  loading,
}: ProfilePostGridProps) {
  const colors = useThemeColors();

  const renderItem = useCallback(
    ({ item }: { item: FeedPostType }) => (
      <GridItem post={item} onPress={() => onPressPost(item)} colors={colors} />
    ),
    [onPressPost, colors]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={48} color={colors.border} />
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No posts yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      numColumns={NUM_COLUMNS}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      contentContainerStyle={styles.grid}
    />
  );
}

const styles = StyleSheet.create({
  grid: {
    // no extra padding — flush with edges
  },
  gridItem: {
    width: ITEM_SIZE - GAP,
    height: (ITEM_SIZE - GAP) * (4 / 3),
    margin: GAP / 2,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  multiImageBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 4,
    padding: 2,
  },
  attachTypeBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 4,
    padding: 3,
  },
  textCell: {
    flex: 1,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  textPreview: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  attachTitle: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
