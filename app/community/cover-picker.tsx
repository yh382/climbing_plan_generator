// app/community/cover-picker.tsx
// Video cover frame selector — Apple-style filmstrip with center indicator.
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system/legacy";

import { useThemeColors } from "@/lib/useThemeColors";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { setPendingMedia } from "@/features/community/pendingMedia";
import { setCoverUpdate } from "@/features/community/pendingCoverUpdate";

const SCREEN_W = Dimensions.get("window").width;
const FRAME_COUNT = 15;
const FRAME_W = Math.round(SCREEN_W / 6);
const FRAME_H = Math.round(FRAME_W * 1.4);
const STRIP_W = FRAME_W * FRAME_COUNT;

/** Convert ph:// video to file:// (existing toFileUri hardcodes .jpg) */
async function videoToFileUri(uri: string): Promise<string> {
  if (!uri.startsWith("ph://")) return uri;
  const dest = `${FileSystem.cacheDirectory}cover_${Date.now()}.mov`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

type FrameData = { time: number; uri: string };

export default function CoverPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const { videoUri, duration: durationParam, id, width, height, source, returnMode } =
    useLocalSearchParams<{
      videoUri: string;
      duration: string;
      id: string;
      width: string;
      height: string;
      source?: string;
      returnMode?: string; // 'cover' = return only coverUri via setCoverUpdate; default = setPendingMedia
    }>();

  const durationSec = parseFloat(durationParam || "0");
  const [currentTime, setCurrentTime] = useState(durationSec / 2);
  const [generating, setGenerating] = useState(false);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loadingFrames, setLoadingFrames] = useState(true);
  const fileUriRef = useRef<string>("");
  const seekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const initialScrollDone = useRef(false);

  const player = useVideoPlayer({ uri: videoUri }, (p) => {
    p.pause();
    if (durationSec > 0) {
      p.currentTime = durationSec / 2;
    }
  });

  // Generate filmstrip frames on mount — parallel for speed
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
        }
      } catch (e) {
        console.warn("[cover-picker] frame generation failed:", e);
        if (!cancelled) setLoadingFrames(false);
      }
    })();
    return () => { cancelled = true; };
  }, [videoUri, durationSec]);

  // Scroll to middle once frames are loaded
  useEffect(() => {
    if (frames.length > 0 && !initialScrollDone.current) {
      initialScrollDone.current = true;
      const midOffset = (STRIP_W - SCREEN_W) / 2;
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: Math.max(0, midOffset), animated: false });
      }, 50);
    }
  }, [frames]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const centerX = offsetX + SCREEN_W / 2;
      const halfPad = SCREEN_W / 2;
      const normalizedX = Math.max(0, Math.min(STRIP_W, centerX - halfPad));
      const dur = durationSec > 0 ? durationSec : 1;
      const t = (normalizedX / STRIP_W) * dur;

      setCurrentTime(t);
      if (seekTimer.current) clearTimeout(seekTimer.current);
      seekTimer.current = setTimeout(() => {
        player.currentTime = t;
      }, 50);
    },
    [player, durationSec]
  );

  const goBack = useCallback(() => {
    // From edit-log-media: dismiss 2 (cover-picker + edit-log-media) → route-detail
    // From route-detail: dismiss 1 → route-detail
    if (source === "edit-log-media") {
      router.dismiss(2);
    } else {
      router.back();
    }
  }, [source, router]);

  const handleDone = useCallback(async () => {
    setGenerating(true);
    try {
      const fileUri = fileUriRef.current || (await videoToFileUri(videoUri));
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
        fileUri,
        { time: Math.round(currentTime * 1000), quality: 0.8 }
      );

      if (returnMode === "cover") {
        // Return only the cover update for this video — used from create.tsx
        setCoverUpdate({ videoId: id, coverUri: thumbUri });
        router.back();
      } else {
        // Default: return full media item — used from device-media-picker
        setPendingMedia([
          {
            id: id || `vid_${Date.now()}`,
            uri: videoUri,
            mediaType: "video",
            width: parseInt(width || "0", 10),
            height: parseInt(height || "0", 10),
            duration: durationSec || undefined,
            coverUri: thumbUri,
          },
        ]);
        goBack();
      }
    } catch (e) {
      console.warn("[cover-picker] thumbnail generation failed:", e);
      if (returnMode === "cover") {
        // No cover to set — just go back
        router.back();
      } else {
        setPendingMedia([
          {
            id: id || `vid_${Date.now()}`,
            uri: videoUri,
            mediaType: "video",
            width: parseInt(width || "0", 10),
            height: parseInt(height || "0", 10),
            duration: durationSec || undefined,
          },
        ]);
        goBack();
      }
    } finally {
      setGenerating(false);
    }
  }, [videoUri, currentTime, id, width, height, durationSec, goBack, returnMode, router]);

  const handleDoneRef = useRef(handleDone);
  handleDoneRef.current = handleDone;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const s = useMemo(() => createStyles(colors, insets), [colors, insets]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerTransparent: true,
          headerLeft: () => (
            <HeaderButton
              icon="chevron.backward"
              onPress={() => router.back()}
            />
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
        {/* Video preview — extends behind transparent header */}
        <View style={s.videoWrap}>
          <VideoView
            player={player}
            style={s.video}
            nativeControls={false}
            contentFit="contain"
          />
          {generating && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </View>

        {/* Filmstrip scrubber */}
        <View style={s.scrubberSection}>
          <Text style={s.label}>Slide to choose cover frame</Text>

          <View style={s.stripContainer}>
            {loadingFrames ? (
              <View style={s.stripLoading}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingHorizontal: SCREEN_W / 2,
                }}
              >
                {frames.map((f, i) => (
                  <Image
                    key={i}
                    source={{ uri: f.uri }}
                    style={s.frameThumb}
                  />
                ))}
              </ScrollView>
            )}

            {/* Center indicator line */}
            <View style={s.centerLine} pointerEvents="none" />
          </View>

          <View style={s.timeRow}>
            <Text style={s.timeText}>{formatTime(currentTime)}</Text>
            <Text style={s.timeText}>{formatTime(durationSec)}</Text>
          </View>
        </View>
      </View>
    </>
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
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    scrubberSection: {
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
    stripContainer: {
      height: FRAME_H,
      overflow: "hidden",
    },
    stripLoading: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    frameThumb: {
      width: FRAME_W,
      height: FRAME_H,
      borderRadius: 4,
    },
    centerLine: {
      position: "absolute",
      left: SCREEN_W / 2 - 1,
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: "#fff",
      borderRadius: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 2,
    },
    timeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      paddingHorizontal: 20,
    },
    timeText: {
      fontSize: 12,
      color: c.textTertiary,
      fontFamily: "DMMono_400Regular",
    },
  });
