// app/library/edit-log-media.tsx
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { consumePendingMedia } from "@/features/community/pendingMedia";
import {
  readDayList,
  readSessionList,
  updateDayItem,
  updateSessionItem,
} from "@/features/journal/loglist/storage";
import { uploadLogMediaBatch, toFileUri } from "@/features/journal/api";
import UploadProgressToast from "@/components/ui/UploadProgressToast";
import type { LocalDayLogItem, LogMedia } from "@/features/journal/loglist/types";

const LOG_MAX_MEDIA = 1;

function ensureMedia(item: LocalDayLogItem): LogMedia[] {
  const arr: LogMedia[] = Array.isArray(item.media) ? [...item.media] : [];
  if (item.imageUri && !arr.some((m) => m.uri === item.imageUri)) {
    arr.push({ id: `img_${item.createdAt}`, type: "image", uri: item.imageUri });
  }
  if (item.videoUri && !arr.some((m) => m.uri === item.videoUri)) {
    arr.push({
      id: `vid_${item.createdAt}`,
      type: "video",
      uri: item.videoUri,
      coverUri: item.coverUri,
    });
  }
  return arr;
}

export default function EditLogMediaScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { date, itemId, type, sessionKey } = useLocalSearchParams<{
    date: string;
    itemId: string;
    type: string;
    sessionKey?: string;
  }>();

  const climbType =
    type === "toprope" || type === "lead" ? type : "boulder";

  const [item, setItem] = useState<LocalDayLogItem | null>(null);
  const [mediaItems, setMediaItems] = useState<LogMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load item on mount
  useEffect(() => {
    if (!date || !itemId) return;
    let cancelled = false;

    const load = async () => {
      const items = sessionKey
        ? await readSessionList(sessionKey, climbType)
        : await readDayList(date, climbType);
      if (cancelled) return;
      const found = items.find((it) => it.id === itemId) ?? null;
      setItem(found);
      if (found) {
        setMediaItems(ensureMedia(found));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [date, itemId, climbType, sessionKey]);

  // Consume pending media from device picker (images only — videos go through cover-picker → route-detail)
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingMedia();
      if (pending && pending.length > 0) {
        // Convert ph:// → file:// before storing (preserve coverUri)
        (async () => {
          const converted = await Promise.all(
            pending.map(async (p) => ({
              id: p.id,
              type: (p.mediaType === "video" ? "video" : "image") as
                | "video"
                | "image",
              uri: await toFileUri(p.uri),
              coverUri: p.coverUri || undefined,
            }))
          );
          setMediaItems((prev) =>
            [...prev, ...converted].slice(0, LOG_MAX_MEDIA)
          );
        })();
      }
    }, [])
  );

  const handleAddMore = useCallback(() => {
    if (mediaItems.length >= LOG_MAX_MEDIA) {
      Alert.alert("Limit", `Max ${LOG_MAX_MEDIA} media per log`);
      return;
    }
    const remaining = LOG_MAX_MEDIA - mediaItems.length;
    router.push({ pathname: "/community/device-media-picker", params: { maxSelect: String(remaining), defaultAlbum: "Videos", source: "edit-log-media" } });
  }, [mediaItems.length, router]);

  const handleRemove = useCallback((mediaId: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== mediaId));
  }, []);

  const handleDone = useCallback(async () => {
    if (!item) return;

    // 1. Upload new items (those with local URI, not R2 URL)
    const toUpload = mediaItems.filter((m) => !m.uri.startsWith("http"));
    let finalMedia = [...mediaItems];

    if (toUpload.length > 0) {
      setUploading(true);
      setUploadProgress(0);
      try {
        // Build upload list: main media files
        const uploadItems = toUpload.map((m) => ({
          uri: m.uri,
          contentType: m.type === "video" ? "video/mp4" : "image/jpeg",
        }));
        // Append cover thumbnails that need uploading
        const coverIndices: number[] = [];
        for (const m of toUpload) {
          if (m.coverUri && !m.coverUri.startsWith("http")) {
            coverIndices.push(uploadItems.length);
            uploadItems.push({ uri: m.coverUri, contentType: "image/jpeg" });
          }
        }

        const results = await uploadLogMediaBatch(
          uploadItems,
          (p) => setUploadProgress(p)
        );

        // Map cover upload results
        let coverResultIdx = 0;
        const coverUrls: Record<string, string> = {};
        for (const m of toUpload) {
          if (m.coverUri && !m.coverUri.startsWith("http") && coverIndices[coverResultIdx] !== undefined) {
            const ri = coverIndices[coverResultIdx];
            if (results[ri]) coverUrls[m.id] = results[ri].public_url;
            coverResultIdx++;
          }
        }

        // Replace local URIs with R2 URLs
        finalMedia = mediaItems.map((m) => {
          const uploadIdx = toUpload.findIndex((u) => u.id === m.id);
          if (uploadIdx >= 0 && results[uploadIdx]) {
            return {
              ...m,
              uri: results[uploadIdx].public_url,
              coverUri: coverUrls[m.id] || m.coverUri,
            };
          }
          return m;
        });
      } catch (e) {
        if (__DEV__) console.warn("Upload failed:", e);
        Alert.alert("Upload Error", "Some media failed to upload. Please try again.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    // 2. Update storage
    const updater = (old: LocalDayLogItem) => ({
      ...old,
      media: finalMedia,
      // Clear legacy fields if media array is now authoritative
      imageUri: undefined,
      videoUri: undefined,
      coverUri: undefined,
    });

    try {
      if (sessionKey) {
        await updateSessionItem(sessionKey, climbType, item.id, updater);
      } else if (date) {
        await updateDayItem(date, climbType, item.id, updater);
      }
    } catch (e) {
      if (__DEV__) console.warn("Failed to save media:", e);
    }

    // 3. Go back
    router.back();
  }, [item, mediaItems, sessionKey, climbType, date, router]);

  const s = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: "Edit Media",
          headerRight: () => (
            <HeaderButton icon="checkmark" onPress={handleDone} />
          ),
        }}
      />

      <FlatList
        data={mediaItems}
        keyExtractor={(m) => m.id}
        numColumns={3}
        contentContainerStyle={s.grid}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item: m }) => (
          <View style={s.mediaCell}>
            <Image source={{ uri: m.uri }} style={s.mediaThumbnail} contentFit="cover" />
            {m.type === "video" && (
              <View style={s.videoOverlay}>
                <Ionicons name="play-circle" size={24} color="rgba(255,255,255,0.9)" />
              </View>
            )}
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => handleRemove(m.id)}
            >
              <Ionicons name="close-circle" size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
        ListFooterComponent={
          mediaItems.length < LOG_MAX_MEDIA ? (
            <TouchableOpacity style={[s.addBtn, { borderColor: colors.border }]} onPress={handleAddMore}>
              <Ionicons name="add" size={32} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null
        }
      />

      <UploadProgressToast
        visible={uploading}
        progress={uploadProgress}
        onDismiss={() => setUploading(false)}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof import("@/lib/useThemeColors").useThemeColors>) =>
  StyleSheet.create({
    grid: {
      padding: 16,
    },
    mediaCell: {
      width: "31%",
      aspectRatio: 1,
      marginRight: "2.3%",
      marginBottom: 12,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: colors.backgroundSecondary,
    },
    mediaThumbnail: {
      width: "100%",
      height: "100%",
    },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    removeBtn: {
      position: "absolute",
      top: 4,
      right: 4,
    },
    addBtn: {
      width: "31%",
      aspectRatio: 1,
      borderRadius: 10,
      borderWidth: 1.5,
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
  });
