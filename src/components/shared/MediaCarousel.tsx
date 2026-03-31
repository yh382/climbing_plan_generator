// src/components/shared/MediaCarousel.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import type { MediaItem } from "../../types/community";

// ── Inline video player ──
// Uses play/pause (not mount/unmount) for smooth transitions.
// Tap when playing → native iOS fullscreen; tap when paused → delegate to parent.

// Module-level muted state for inline videos (resets on app launch)
let globalInlineMuted = true;

// Block video taps while a system sheet (e.g. Share) is presented
let _blockVideoTaps = false;
export function setBlockVideoTaps(block: boolean) {
  _blockVideoTaps = block;
}

function InlineVideoPlayer({
  uri,
  thumbUri,
  shouldPlay,
  onTapWhenNotPlaying,
}: {
  uri: string;
  thumbUri?: string;
  shouldPlay: boolean;
  onTapWhenNotPlaying?: () => void;
}) {
  const [muted, setMuted] = useState(globalInlineMuted);
  const player = useVideoPlayer({ uri }, (p) => {
    p.volume = globalInlineMuted ? 0 : 1;
    p.loop = true;
  });
  const viewRef = useRef<VideoView>(null);
  const [inFullscreen, setInFullscreen] = useState(false);

  // Control playback + sync muted state when visibility changes
  useEffect(() => {
    if (shouldPlay) {
      setMuted(globalInlineMuted);
      player.volume = globalInlineMuted ? 0 : 1;
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  const { status } = useEvent(player, "statusChange", { status: player.status });
  const videoReady = status === "readyToPlay";
  const showThumb = !(videoReady && shouldPlay);

  const toggleMute = useCallback(() => {
    const next = !globalInlineMuted;
    globalInlineMuted = next;
    setMuted(next);
    player.volume = next ? 0 : 1;
  }, [player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        onPress={() => {
          if (_blockVideoTaps) return;
          shouldPlay
            ? viewRef.current?.enterFullscreen()
            : onTapWhenNotPlaying?.();
        }}
        style={StyleSheet.absoluteFill}
      >
        <VideoView
          ref={viewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={inFullscreen}
          contentFit="cover"
          onFullscreenEnter={() => {
            setInFullscreen(true);
            player.volume = 1;
            player.loop = false;
          }}
          onFullscreenExit={() => {
            setInFullscreen(false);
            player.volume = globalInlineMuted ? 0 : 1;
            player.loop = true;
          }}
        />
        {showThumb && thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : showThumb ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
            <Ionicons name="videocam" size={36} color="rgba(255,255,255,0.4)" />
          </View>
        ) : null}
      </Pressable>

      {/* Mute/unmute — bottom-right, visible only during inline playback */}
      {shouldPlay && !inFullscreen && (
        <Pressable onPress={toggleMute} style={s0.muteBtn} hitSlop={8}>
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
            size={16}
            color="#fff"
          />
        </Pressable>
      )}
    </View>
  );
}

// ── Main component ──

interface MediaCarouselProps {
  /** @deprecated Use media instead */
  images?: string[];
  /** Typed media items with video support */
  media?: MediaItem[];
  width: number;
  height: number;
  onPressImage?: (index: number) => void;
  /** When false, all videos are paused/unmounted */
  isVisible?: boolean;
}

export default function MediaCarousel({
  images,
  media,
  width,
  height,
  onPressImage,
  isVisible = true,
}: MediaCarouselProps) {
  const colors = useThemeColors();
  const ds = useMemo(() => createDynStyles(colors), [colors]);

  // Normalize: prefer media prop, fall back to images
  const items: MediaItem[] = useMemo(() => {
    if (media && media.length > 0) return media;
    if (images && images.length > 0)
      return images.map((url) => ({ type: "image" as const, url }));
    return [];
  }, [media, images]);

  // Prefetch video thumbnails → instant display when scrolling
  useEffect(() => {
    items.forEach((item) => {
      if (item.type === "video" && item.thumbUrl) {
        Image.prefetch(item.thumbUrl);
      }
    });
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / width);
      if (page >= 0 && page < items.length) {
        setActiveIndex(page);
      }
    },
    [width, items.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      const isCurrentPage = index === activeIndex;
      const shouldPlay = isVisible && isCurrentPage && item.type === "video";

      return (
        <View style={{ width, height, backgroundColor: "#000" }}>
          {item.type === "video" ? (
            // Video: thumbnail is rendered INSIDE InlineVideoPlayer (above VideoView)
            <InlineVideoPlayer
              uri={item.url}
              thumbUri={item.thumbUrl}
              shouldPlay={shouldPlay}
              onTapWhenNotPlaying={() => onPressImage?.(index)}
            />
          ) : (
            // Image: render normally
            <>
              <Image
                source={{ uri: item.url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <TouchableWithoutFeedback onPress={() => onPressImage?.(index)}>
                <View style={StyleSheet.absoluteFill} />
              </TouchableWithoutFeedback>
            </>
          )}
        </View>
      );
    },
    [width, height, onPressImage, activeIndex, isVisible],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  return (
    <View>
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        extraData={`${activeIndex}-${isVisible}`}
      />

      {/* Counter badge — top-right */}
      {items.length > 1 && (
        <View style={s0.counterBadge}>
          <Text style={s0.counterText}>{activeIndex + 1}/{items.length}</Text>
        </View>
      )}

      {/* Dot indicators — only show for multi-item */}
      {items.length > 1 && (
        <View style={s0.dots}>
          {items.map((_, i) => (
            <View
              key={i}
              style={[ds.dot, i === activeIndex && ds.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// Static styles (no theme dependency)
const s0 = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
    gap: 6,
  },
  counterBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  muteBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Dynamic styles (theme-aware)
const createDynStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.textPrimary,
      width: 8,
      height: 8,
      borderRadius: 4,
    },
  });
