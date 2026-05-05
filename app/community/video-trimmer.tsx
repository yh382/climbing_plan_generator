// app/community/video-trimmer.tsx
// Video trimmer — filmstrip with two draggable handles for head/tail trim.
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system/legacy";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/useThemeColors";
import { HeaderButton } from "@/components/ui/HeaderButton";

const SCREEN_W = Dimensions.get("window").width;
const STRIP_PADDING = 20;
const STRIP_W = SCREEN_W - STRIP_PADDING * 2;
const FRAME_COUNT = 15;
const FRAME_W = Math.round(STRIP_W / FRAME_COUNT);
const FRAME_H = Math.round(FRAME_W * 1.4);
const HANDLE_W = 16;
const MIN_TRIM_SEC = 1; // minimum 1 second

/** Convert ph:// video to file:// */
async function videoToFileUri(uri: string): Promise<string> {
  if (!uri.startsWith("ph://")) return uri;
  const dest = `${FileSystem.cacheDirectory}trim_${Date.now()}.mov`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

type FrameData = { time: number; uri: string };

export default function VideoTrimmerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const {
    videoUri,
    duration: durationParam,
    id,
    width,
    height,
    source,
  } = useLocalSearchParams<{
    videoUri: string;
    duration: string;
    id: string;
    width: string;
    height: string;
    source?: string;
  }>();

  const durationSec = parseFloat(durationParam || "0") || 0;
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);
  const [trimming, setTrimming] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileUriRef = useRef<string>("");

  // Trim state (in pixels relative to strip)
  const leftPx = useSharedValue(0);
  const rightPx = useSharedValue(STRIP_W);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(durationSec);

  const player = useVideoPlayer({ uri: videoUri }, (p) => {
    p.pause();
  });

  // Generate filmstrip frames
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fileUri = await videoToFileUri(videoUri);
        fileUriRef.current = fileUri;
        const dur = durationSec > 0 ? durationSec : 1;

        const promises = Array.from({ length: FRAME_COUNT }, (_, i) => {
          const time = (i / (FRAME_COUNT - 1)) * dur;
          return VideoThumbnails.getThumbnailAsync(fileUri, {
            time: Math.round(time * 1000),
            quality: 0.2,
          })
            .then(({ uri: thumbUri }) => ({ time, uri: thumbUri }))
            .catch(() => null);
        });

        const results = await Promise.all(promises);
        if (!cancelled) {
          setFrames(results.filter((r): r is FrameData => r !== null));
          setLoadingFrames(false);
          rightPx.value = STRIP_W;
        }
      } catch (e) {
        console.warn("[video-trimmer] frame generation failed:", e);
        if (!cancelled) setLoadingFrames(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoUri, durationSec]);

  // Pixel → time conversion
  const pxToTime = useCallback((px: number) => {
    return (px / STRIP_W) * durationSec;
  }, [durationSec]);

  const updateTrimStart = useCallback((px: number) => {
    setTrimStart(pxToTime(px));
  }, [pxToTime]);

  const updateTrimEnd = useCallback((px: number) => {
    setTrimEnd(pxToTime(px));
  }, [pxToTime]);

  // Left handle gesture — activeOffsetX gives the iOS edge-swipe priority
  // when the user starts near the screen edge, so the handle pan doesn't
  // steal the navigation back gesture.
  const leftStart = useSharedValue(0);
  const leftGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onBegin(() => { leftStart.value = leftPx.value; })
    .onUpdate((e) => {
      const minPx = 0;
      const maxPx = rightPx.value - (MIN_TRIM_SEC / durationSec) * STRIP_W;
      const newX = Math.max(minPx, Math.min(maxPx, leftStart.value + e.translationX));
      leftPx.value = newX;
      runOnJS(updateTrimStart)(newX);
    });

  // Right handle gesture
  const rightStart = useSharedValue(STRIP_W);
  const rightGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .onBegin(() => { rightStart.value = rightPx.value; })
    .onUpdate((e) => {
      const minPx = leftPx.value + (MIN_TRIM_SEC / durationSec) * STRIP_W;
      const maxPx = STRIP_W;
      const newX = Math.max(minPx, Math.min(maxPx, rightStart.value + e.translationX));
      rightPx.value = newX;
      runOnJS(updateTrimEnd)(newX);
    });

  // Handles sit INSIDE the strip (flush with its edges) — previously they
  // overhung the strip by HANDLE_W in either direction, which put them
  // ~4pt from the screen edge on iPhones and made them easy to miss/hard
  // to hit without triggering the iOS edge-swipe.
  const leftStyle = useAnimatedStyle(() => ({
    left: leftPx.value,
  }));

  const rightStyle = useAnimatedStyle(() => ({
    left: rightPx.value - HANDLE_W,
  }));

  const dimLeftStyle = useAnimatedStyle(() => ({
    width: leftPx.value,
  }));

  const dimRightStyle = useAnimatedStyle(() => ({
    width: STRIP_W - rightPx.value,
  }));

  // Preview playback of trimmed range
  const handlePreview = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.currentTime = trimStart;
      player.play();
      setIsPlaying(true);
      // Stop at trimEnd
      const checkInterval = setInterval(() => {
        if (player.currentTime >= trimEnd) {
          player.pause();
          setIsPlaying(false);
          clearInterval(checkInterval);
        }
      }, 100);
      setTimeout(() => clearInterval(checkInterval), (trimEnd - trimStart + 1) * 1000);
    }
  }, [player, trimStart, trimEnd, isPlaying]);

  // Confirm trim → native trim → route to cover-picker
  const handleDone = useCallback(async () => {
    // If no trimming needed (full range), skip native trim
    const needsTrim = trimStart > 0.1 || (durationSec - trimEnd) > 0.1;

    if (!needsTrim) {
      // Skip trim, go directly to cover-picker
      router.replace({
        pathname: "/community/cover-picker",
        params: {
          videoUri,
          duration: String(durationSec),
          id: id || `vid_${Date.now()}`,
          width: width || "0",
          height: height || "0",
          source,
        },
      });
      return;
    }

    setTrimming(true);
    try {
      const ClimmateVideoTrim = (await import("../../modules/climmate-video-trim/src")).default;
      if (!ClimmateVideoTrim) {
        console.warn("[video-trimmer] native module not available, skipping trim");
        router.replace({
          pathname: "/community/cover-picker",
          params: {
            videoUri,
            duration: String(trimEnd - trimStart),
            id: id || `vid_${Date.now()}`,
            width: width || "0",
            height: height || "0",
            source,
          },
        });
        return;
      }

      const fileUri = fileUriRef.current || (await videoToFileUri(videoUri));
      const trimmedUri = await ClimmateVideoTrim.trim(fileUri, trimStart, trimEnd);

      router.replace({
        pathname: "/community/cover-picker",
        params: {
          videoUri: trimmedUri,
          duration: String(trimEnd - trimStart),
          id: id || `vid_${Date.now()}`,
          width: width || "0",
          height: height || "0",
          source,
        },
      });
    } catch (e) {
      console.warn("[video-trimmer] trim failed:", e);
      // Fallback: proceed with untrimmed video
      router.replace({
        pathname: "/community/cover-picker",
        params: {
          videoUri,
          duration: String(durationSec),
          id: id || `vid_${Date.now()}`,
          width: width || "0",
          height: height || "0",
          source,
        },
      });
    } finally {
      setTrimming(false);
    }
  }, [trimStart, trimEnd, durationSec, videoUri, id, width, height, source, router]);

  const handleDoneRef = useRef(handleDone);
  handleDoneRef.current = handleDone;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    return `${m}:${s.padStart(4, "0")}`;
  };

  const trimDuration = Math.max(0, trimEnd - trimStart);

  const s = useMemo(() => createStyles(colors, insets), [colors, insets]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: HEADER_TRANSPARENT,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          headerLeft: () => (
            <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
          ),
          headerRight: () => (
            <HeaderButton
              icon="checkmark"
              onPress={() => handleDoneRef.current()}
            />
          ),
        }}
      />
      <View style={s.container}>
        {/* Video preview */}
        <View style={s.videoWrap}>
          <VideoView
            player={player}
            style={s.video}
            nativeControls={false}
            contentFit="contain"
          />
          {trimming && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={s.trimmingText}>Trimming...</Text>
            </View>
          )}
          {/* Play/pause button */}
          <TouchableOpacity
            style={s.playButton}
            onPress={handlePreview}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {/* Trim controls */}
        <View style={s.trimSection}>
          <Text style={s.label}>Drag handles to trim</Text>

          {/* Filmstrip + handles share the same positioned wrapper so the
              handles align vertically with the strip. Handles cannot live
              INSIDE stripContainer because it has overflow:'hidden' for the
              dim overlays — they'd be clipped. So: wrapper → stripContainer
              (clipped) + handles (absolute, not clipped). */}
          <View style={s.stripAndHandlesWrap}>
            <View style={s.stripContainer}>
              {loadingFrames ? (
                <View style={s.stripLoading}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                </View>
              ) : (
                <View style={s.stripRow}>
                  {frames.map((f, i) => (
                    <Image
                      key={i}
                      source={{ uri: f.uri }}
                      style={s.frameThumb}
                    />
                  ))}
                </View>
              )}

              {/* Dim overlays for trimmed portions */}
              <Animated.View style={[s.dimOverlay, s.dimLeft, dimLeftStyle]} />
              <Animated.View style={[s.dimOverlay, s.dimRight, dimRightStyle]} />
            </View>

            {/* Draggable handles — absolute-positioned in this wrapper so
                their y aligns with the strip. Wrapped in a bigger hit area
                via `hitSlop` to make grabbing forgiving. */}
            <GestureDetector gesture={leftGesture}>
              <Animated.View
                style={[s.handle, s.handleLeft, leftStyle]}
                hitSlop={{ left: 16, right: 16, top: 12, bottom: 12 }}
              >
                <View style={s.handleBar} />
              </Animated.View>
            </GestureDetector>

            <GestureDetector gesture={rightGesture}>
              <Animated.View
                style={[s.handle, s.handleRight, rightStyle]}
                hitSlop={{ left: 16, right: 16, top: 12, bottom: 12 }}
              >
                <View style={s.handleBar} />
              </Animated.View>
            </GestureDetector>
          </View>

          {/* Time labels */}
          <View style={s.timeRow}>
            <Text style={s.timeText}>{formatTime(trimStart)}</Text>
            <Text style={s.durationBadge}>{trimDuration.toFixed(1)}s</Text>
            <Text style={s.timeText}>{formatTime(trimEnd)}</Text>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const createStyles = (
  c: ReturnType<typeof useThemeColors>,
  insets: { top: number; bottom: number }
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: insets.top + 56,
    },
    videoWrap: {
      flex: 1,
      backgroundColor: c.backgroundSecondary,
    },
    video: {
      flex: 1,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    trimmingText: {
      color: "#fff",
      fontSize: 14,
      fontFamily: "DMSans_500Medium",
      marginTop: 8,
    },
    playButton: {
      position: "absolute",
      bottom: 16,
      alignSelf: "center",
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    trimSection: {
      paddingTop: 16,
      paddingBottom: insets.bottom + 16,
      backgroundColor: c.background,
    },
    label: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: "center",
      marginBottom: 12,
      fontFamily: "DMSans_500Medium",
    },
    stripAndHandlesWrap: {
      // Same horizontal inset as the old stripContainer so absolute
      // handles inside use coordinates 0..STRIP_W aligned with the strip.
      marginHorizontal: STRIP_PADDING,
      height: FRAME_H,
    },
    stripContainer: {
      height: FRAME_H,
      overflow: "hidden",
      borderRadius: 6,
    },
    stripLoading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    stripRow: {
      flexDirection: "row",
    },
    frameThumb: {
      width: FRAME_W,
      height: FRAME_H,
    },
    dimOverlay: {
      position: "absolute",
      top: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    dimLeft: {
      left: 0,
    },
    dimRight: {
      right: 0,
    },
    handle: {
      position: "absolute",
      top: 0,
      width: HANDLE_W,
      height: FRAME_H,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    handleLeft: {
      borderTopLeftRadius: 6,
      borderBottomLeftRadius: 6,
      backgroundColor: "#FFD60A",
    },
    handleRight: {
      borderTopRightRadius: 6,
      borderBottomRightRadius: 6,
      backgroundColor: "#FFD60A",
    },
    handleBar: {
      width: 3,
      height: 24,
      borderRadius: 1.5,
      backgroundColor: "#1C1C1E",
    },
    timeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingHorizontal: STRIP_PADDING,
    },
    timeText: {
      fontSize: 12,
      color: c.textTertiary,
      fontFamily: "DMMono_400Regular",
    },
    durationBadge: {
      fontSize: 13,
      color: c.textPrimary,
      fontFamily: "DMSans_700Bold",
      backgroundColor: c.backgroundSecondary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: "hidden",
    },
  });
