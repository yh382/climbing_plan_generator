// app/library/route-detail.tsx
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  ActionSheetIOS,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import { useThemeColors } from "../../src/lib/useThemeColors";
import { getColorForGrade } from "../../lib/gradeColors";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { consumePendingMedia } from "../../src/features/community/pendingMedia";
import UploadProgressToast from "../../src/components/ui/UploadProgressToast";
import { uploadLogMediaBatch } from "../../src/features/journal/api";
import {
  readDayList,
  readSessionList,
  writeDayList,
  writeSessionList,
  updateDayItem,
  updateSessionItem,
} from "../../src/features/journal/loglist/storage";
import type { LocalDayLogItem, LogMedia } from "../../src/features/journal/loglist/types";

const SCREEN_W = Dimensions.get("window").width;
const LOG_MAX_MEDIA = 2;

function ensureMedia(item: LocalDayLogItem): LogMedia[] {
  const arr: LogMedia[] = Array.isArray(item.media) ? item.media : [];
  if (item.imageUri && !arr.some((m) => m.uri === item.imageUri)) {
    arr.push({ id: `img_${item.createdAt}`, type: "image", uri: item.imageUri });
  }
  if (item.videoUri && !arr.some((m) => m.uri === item.videoUri)) {
    arr.push({ id: `vid_${item.createdAt}`, type: "video", uri: item.videoUri, coverUri: item.coverUri });
  }
  return arr;
}

export default function RouteDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const { date, itemId, type, sessionKey } = useLocalSearchParams<{
    date: string;
    itemId: string;
    type: string;
    sessionKey?: string;
  }>();

  const [item, setItem] = useState<LocalDayLogItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const climbType = (type === "toprope" || type === "lead") ? type : "boulder";

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
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [date, itemId, climbType, sessionKey]);

  const media = useMemo(() => (item ? ensureMedia(item) : []), [item]);

  const handleAddMedia = useCallback(() => {
    if (media.length >= LOG_MAX_MEDIA) {
      Alert.alert("Limit Reached", `Each log can have up to ${LOG_MAX_MEDIA} media items.`);
      return;
    }
    router.push("/community/device-media-picker");
  }, [media.length, router]);

  // Consume media from device-media-picker when returning, then upload to R2
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingMedia();
      if (!pending || pending.length === 0 || !item) return;

      const existing = ensureMedia(item);
      const remaining = LOG_MAX_MEDIA - existing.length;
      if (remaining <= 0) return;

      const toAdd: LogMedia[] = pending.slice(0, remaining).map((p) => ({
        id: p.id,
        type: p.mediaType === "video" ? "video" : "image",
        uri: p.uri,
      }));

      let cancelled = false;
      (async () => {
        try {
          // Save local URIs first
          const updater = (old: LocalDayLogItem) => ({
            ...old,
            media: [...ensureMedia(old), ...toAdd],
          });
          const nextList = sessionKey
            ? await updateSessionItem(sessionKey, climbType, item.id, updater)
            : await updateDayItem(date, climbType, item.id, updater);
          if (!cancelled && nextList) {
            const updated = nextList.find((it) => it.id === itemId) ?? null;
            setItem(updated);
          }

          // Upload to R2
          setUploading(true);
          setUploadProgress(0);
          const results = await uploadLogMediaBatch(
            toAdd.map((m) => ({
              uri: m.uri,
              contentType: m.type === "video" ? "video/mp4" : "image/jpeg",
            })),
            (p) => setUploadProgress(p),
          );

          // Replace local URIs with R2 URLs
          if (!cancelled && results.length > 0) {
            const urlUpdater = (old: LocalDayLogItem) => {
              const oldMedia = ensureMedia(old);
              const newMedia = oldMedia.map((m) => {
                const idx = toAdd.findIndex((a) => a.id === m.id);
                if (idx >= 0 && results[idx]) {
                  return { ...m, uri: results[idx].public_url };
                }
                return m;
              });
              return { ...old, media: newMedia };
            };
            const finalList = sessionKey
              ? await updateSessionItem(sessionKey, climbType, item.id, urlUpdater)
              : await updateDayItem(date, climbType, item.id, urlUpdater);
            if (!cancelled && finalList) {
              const updated = finalList.find((it) => it.id === itemId) ?? null;
              setItem(updated);
            }
          }
        } catch (e) {
          if (__DEV__) console.warn("Failed to save/upload media:", e);
        } finally {
          setUploading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [item, sessionKey, climbType, date, itemId])
  );

  const handleDeleteLog = useCallback(() => {
    Alert.alert("Delete Log", "Are you sure you want to delete this log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (sessionKey) {
              const list = await readSessionList(sessionKey, climbType);
              const filtered = list.filter((it) => it.id !== itemId);
              await writeSessionList(sessionKey, climbType, filtered);
            } else if (date) {
              const list = await readDayList(date, climbType);
              const filtered = list.filter((it) => it.id !== itemId);
              await writeDayList(date, climbType, filtered);
            }
            router.back();
          } catch (e) {
            if (__DEV__) console.warn("Failed to delete log:", e);
          }
        },
      },
    ]);
  }, [sessionKey, climbType, date, itemId, router]);

  const showRouteMenu = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Edit Media", "Delete Log", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          router.push({
            pathname: "/library/edit-log-media",
            params: { date, itemId, type: climbType, sessionKey: sessionKey ?? "" },
          });
        }
        if (buttonIndex === 1) handleDeleteLog();
      }
    );
  }, [date, itemId, climbType, sessionKey, router, handleDeleteLog]);

  const headerRightButton = useCallback(() => (
    <HeaderButton
      icon={media.length > 0 ? "pencil" : "plus.circle"}
      onPress={() => {
        if (media.length > 0) {
          router.push({
            pathname: "/library/edit-log-media",
            params: { date, itemId, type: climbType, sessionKey: sessionKey ?? "" },
          });
        } else {
          handleAddMedia();
        }
      }}
    />
  ), [media.length, date, itemId, climbType, sessionKey, router, handleAddMedia]);

  const s = useMemo(() => createStyles(colors), [colors]);

  if (!item) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: "Route Detail", headerRight: headerRightButton }} />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="alert-circle-outline" size={44} color={colors.textTertiary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
            Route not found
          </Text>
        </View>
      </View>
    );
  }

  const routeName = (item.name || "").trim() || item.grade;
  const gc = getColorForGrade(item.grade);
  const displayDate = date
    ? format(parseISO(date), "EEEE, MMM dd")
    : "";

  // Get media for display
  const mediaUri = media[0]?.uri || "";
  const isVideo = media[0]?.type === "video";

  // Style label
  const styleLabel =
    item.style === "flash"
      ? "Flash"
      : item.style === "onsight"
        ? "Onsight"
        : item.style === "redpoint"
          ? "Redpoint"
          : "";

  // Feel label
  const feelLabel =
    item.feel === "soft"
      ? "Soft"
      : item.feel === "solid"
        ? "Solid"
        : item.feel === "hard"
          ? "Hard"
          : "";

  const attempts = item.attemptsTotal || item.attempts || 1;
  const note = (item.note || "").trim();

  return (
    <View style={s.container}>
      <Stack.Screen options={{ title: "Route Detail", headerRight: headerRightButton }} />

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Media section - always visible */}
        <View style={s.mediaContainer}>
          {mediaUri ? (
            <>
              <Image
                source={{ uri: mediaUri }}
                style={s.mediaImage}
                resizeMode="cover"
              />
              {isVideo && (
                <View style={s.playOverlay}>
                  <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.9)" />
                </View>
              )}
            </>
          ) : (
            <View style={s.mediaPlaceholder}>
              <Ionicons name="camera-outline" size={44} color={colors.textTertiary} />
            </View>
          )}
        </View>

        {/* Route info */}
        <View style={s.infoSection}>
          <Text style={s.routeName}>{routeName}</Text>

          <View style={s.gradeRow}>
            <View style={[s.gradeDot, { backgroundColor: gc }]} />
            <Text style={s.gradeText}>{item.grade}</Text>
          </View>

          {displayDate ? (
            <Text style={s.dateText}>{displayDate}</Text>
          ) : null}
        </View>

        {/* Tags row */}
        <View style={s.tagsRow}>
          {styleLabel ? (
            <View style={s.tag}>
              <Text style={s.tagText}>{styleLabel}</Text>
            </View>
          ) : null}
          {feelLabel ? (
            <View style={s.tag}>
              <Text style={s.tagText}>{feelLabel}</Text>
            </View>
          ) : null}
          <View style={s.tag}>
            <Text style={s.tagText}>{attempts}x</Text>
          </View>
        </View>

        {/* Notes */}
        {note ? (
          <View style={s.noteSection}>
            <Text style={s.noteLabel}>Notes</Text>
            <Text style={s.noteContent}>{note}</Text>
          </View>
        ) : null}

        {/* Actions row */}
        <View style={s.actionsRow}>
          <TouchableOpacity onPress={showRouteMenu} style={s.menuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <UploadProgressToast
        visible={uploading}
        progress={uploadProgress}
        onDismiss={() => setUploading(false)}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    mediaContainer: {
      width: SCREEN_W,
      height: SCREEN_W * 0.65,
      backgroundColor: colors.backgroundSecondary,
    },
    mediaImage: {
      width: "100%",
      height: "100%",
    },
    playOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.15)",
    },
    mediaPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },

    infoSection: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    routeName: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    gradeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    gradeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    gradeText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
    },
    dateText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },

    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    tag: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    tagText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "600",
    },

    noteSection: {
      padding: 20,
    },
    noteLabel: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    noteContent: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
    },

    actionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    menuBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
