// src/components/shared/ImageViewer.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  StatusBar,
  ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import type { MediaItem } from "../../types/community";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ── Full-screen video player (auto-plays with sound) ──

function FullScreenVideoPlayer({
  uri,
  isActive,
}: {
  uri: string;
  isActive: boolean;
}) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.play();
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={styles.fullImage}
      nativeControls
      contentFit="contain"
    />
  );
}

// ── Main component ──

interface ImageViewerProps {
  /** @deprecated Use media instead */
  images?: string[];
  /** Typed media items with video support */
  media?: MediaItem[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImageViewer({
  images,
  media,
  initialIndex = 0,
  visible,
  onClose,
}: ImageViewerProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Normalize: prefer media prop, fall back to images
  const items: MediaItem[] = useMemo(() => {
    if (media && media.length > 0) return media;
    if (images && images.length > 0)
      return images.map((url) => ({ type: "image" as const, url }));
    return [];
  }, [media, images]);

  // Reset currentIndex when viewer opens with a new initialIndex
  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => (
      <View style={styles.imageContainer}>
        {item.type === "video" ? (
          <FullScreenVideoPlayer
            uri={item.url}
            isActive={index === currentIndex}
          />
        ) : (
          <Image
            source={{ uri: item.url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        )}
      </View>
    ),
    [currentIndex],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_W,
      offset: SCREEN_W * index,
      index,
    }),
    [],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Media gallery */}
        <FlatList
          ref={flatListRef}
          data={items}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={getItemLayout}
          renderItem={renderItem}
          keyExtractor={(_, i) => String(i)}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Indicator */}
        {items.length > 1 && (
          <View style={[styles.indicator, { bottom: insets.bottom + 24 }]}>
            <Text style={styles.indicatorText}>
              {currentIndex + 1} / {items.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    width: SCREEN_W,
    height: SCREEN_H,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.75,
  },
  indicator: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  indicatorText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
