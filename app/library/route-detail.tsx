// app/library/route-detail.tsx
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
  Pressable,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import * as ScreenOrientation from "expo-screen-orientation";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import { useThemeColors } from "../../src/lib/useThemeColors";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { getColorForGrade } from "../../lib/gradeColors";
import { consumePendingMedia } from "../../src/features/community/pendingMedia";
import UploadProgressToast from "../../src/components/ui/UploadProgressToast";
import { toFileUri, uploadLogMediaBatch } from "../../src/features/journal/api";
import { enqueueLogEvent } from "../../src/features/journal/sync/logsOutbox";
import { syncWidgetFromStore } from "@/lib/widgetBridge";
import useLogsStore from "../../src/store/useLogsStore";
import {
  readDayList,
  readSessionList,
  writeDayList,
  writeSessionList,
  updateDayItem,
  updateSessionItem,
} from "../../src/features/journal/loglist/storage";
import type { LocalDayLogItem, LogMedia } from "../../src/features/journal/loglist/types";
import { recalcIntensityForDate } from "../../src/services/stats/intensityCalculator";

const SCREEN_W = Dimensions.get("window").width;
const NAV_BAR_H = 44;
const LOG_MAX_MEDIA = 1;

function ensureMedia(item: LocalDayLogItem): LogMedia[] {
  const arr: LogMedia[] = Array.isArray(item.media) ? [...item.media] : [];
  if (item.imageUri && !arr.some((m) => m.uri === item.imageUri)) {
    arr.push({ id: `img_${item.createdAt}`, type: "image", uri: item.imageUri });
  }
  if (item.videoUri && !arr.some((m) => m.uri === item.videoUri)) {
    arr.push({ id: `vid_${item.createdAt}`, type: "video", uri: item.videoUri, coverUri: item.coverUri });
  }
  return arr;
}

function VideoPlayerModal({ uri, onClose, topInset }: { uri: string; onClose: () => void; topInset: number }) {
  const player = useVideoPlayer({ uri }, (p) => { p.play(); });

  useEffect(() => {
    ScreenOrientation.unlockAsync();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="contain" />
      <TouchableOpacity
        style={{ position: "absolute", top: topInset + 8, left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
        onPress={onClose}
        activeOpacity={0.85}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
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
  const itemRef = useRef<LocalDayLogItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [playingVideoUri, setPlayingVideoUri] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const climbType = (type === "toprope" || type === "lead") ? type : "boulder";

  // Keep ref in sync with state (avoids putting `item` in useFocusEffect deps)
  useEffect(() => { itemRef.current = item; }, [item]);

  useFocusEffect(
    useCallback(() => {
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
    }, [date, itemId, climbType, sessionKey])
  );

  const media = useMemo(() => (item ? ensureMedia(item) : []), [item]);

  const history = useMemo(() => {
    if (!item) return { sends: 0, attemptsTotal: 0, boltLabel: null as null | "Flash" | "Onsight" };

    const boltLabel = item.style === "flash" ? "Flash" : item.style === "onsight" ? "Onsight" : null;

    const sends =
      typeof item.sendCount === "number"
        ? item.sendCount
        : item.style === "flash" || item.style === "onsight" || item.style === "redpoint"
        ? 1
        : 0;

    const attemptsTotal =
      typeof item.attemptsTotal === "number" ? item.attemptsTotal : item.attempts ?? 1;

    return { sends, attemptsTotal, boltLabel };
  }, [item]);

  const handleAddMedia = useCallback(() => {
    if (media.length >= LOG_MAX_MEDIA) {
      Alert.alert("Limit Reached", `Each log can have up to ${LOG_MAX_MEDIA} media items.`);
      return;
    }
    const remaining = LOG_MAX_MEDIA - media.length;
    router.push({ pathname: "/community/device-media-picker", params: { maxSelect: String(remaining), defaultAlbum: "Videos" } });
  }, [media.length, router]);

  // Consume media from device-media-picker when returning, then upload to R2
  // NOTE: uses itemRef (not item) so the callback doesn't re-create when item changes,
  // which would set cancelled=true and prevent the R2 URL save.
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingMedia();
      const currentItem = itemRef.current;
      if (!pending || pending.length === 0 || !currentItem) return;

      const existing = ensureMedia(currentItem);
      const remaining = LOG_MAX_MEDIA - existing.length;
      if (remaining <= 0) return;

      let cancelled = false;
      (async () => {
        // Convert ph:// URIs to file:// before storing
        const toAdd: LogMedia[] = await Promise.all(
          pending.slice(0, remaining).map(async (p) => ({
            id: p.id,
            type: (p.mediaType === "video" ? "video" : "image") as "video" | "image",
            uri: await toFileUri(p.uri),
            coverUri: p.coverUri || undefined,
          }))
        );
        try {
          // Save local URIs first
          const updater = (old: LocalDayLogItem) => ({
            ...old,
            media: [...ensureMedia(old), ...toAdd],
          });
          const nextList = sessionKey
            ? await updateSessionItem(sessionKey, climbType, currentItem.id, updater)
            : await updateDayItem(date, climbType, currentItem.id, updater);
          if (!cancelled && nextList) {
            const updated = nextList.find((it) => it.id === itemId) ?? null;
            setItem(updated);
          }

          // Upload to R2 (media files + cover thumbnails)
          setUploading(true);
          setUploadProgress(0);

          // Build upload list: main media files
          const uploadItems = toAdd.map((m) => ({
            uri: m.uri,
            contentType: m.type === "video" ? "video/mp4" : "image/jpeg",
          }));
          // Append cover thumbnails that need uploading
          const coverIndices: number[] = [];
          for (const m of toAdd) {
            if (m.coverUri && m.coverUri.startsWith("file://")) {
              coverIndices.push(uploadItems.length);
              uploadItems.push({ uri: m.coverUri, contentType: "image/jpeg" });
            }
          }

          const results = await uploadLogMediaBatch(
            uploadItems,
            (p) => setUploadProgress(p),
          );

          // Replace local URIs with R2 URLs
          if (results.length > 0) {
            // Map cover upload results back to toAdd items
            let coverResultIdx = 0;
            const coverUrls: Record<string, string> = {};
            for (let i = 0; i < toAdd.length; i++) {
              if (toAdd[i].coverUri && toAdd[i].coverUri!.startsWith("file://") && coverIndices[coverResultIdx] !== undefined) {
                const ri = coverIndices[coverResultIdx];
                if (results[ri]) coverUrls[toAdd[i].id] = results[ri].public_url;
                coverResultIdx++;
              }
            }

            const urlUpdater = (old: LocalDayLogItem) => {
              const oldMedia = ensureMedia(old);
              const newMedia = oldMedia.map((m) => {
                const idx = toAdd.findIndex((a) => a.id === m.id);
                if (idx >= 0 && results[idx]) {
                  return {
                    ...m,
                    uri: results[idx].public_url,
                    coverUri: coverUrls[m.id] || m.coverUri,
                  };
                }
                return m;
              });
              return { ...old, media: newMedia };
            };
            // Always save R2 URLs to storage (even if screen navigated away)
            const finalList = sessionKey
              ? await updateSessionItem(sessionKey, climbType, currentItem.id, urlUpdater)
              : await updateDayItem(date, climbType, currentItem.id, urlUpdater);
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
    }, [sessionKey, climbType, date, itemId])
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
              recalcIntensityForDate(date).catch(() => {});
            }

            // Sync deletion to backend via outbox. If this log was never
            // synced (serverId unknown), the flush handler skips silently.
            await enqueueLogEvent({ type: "delete", localId: itemId });
            syncWidgetFromStore();

            router.back();
          } catch (e) {
            if (__DEV__) console.warn("Failed to delete log:", e);
          }
        },
      },
    ]);
  }, [sessionKey, climbType, date, itemId, router]);

  const handleRepeat = useCallback(async () => {
    if (!item) return;

    const updater = (old: LocalDayLogItem) => {
      const sends =
        typeof old.sendCount === "number"
          ? old.sendCount
          : old.style === "flash" || old.style === "onsight" || old.style === "redpoint"
          ? 1
          : 0;
      const attempts =
        typeof old.attemptsTotal === "number" ? old.attemptsTotal : old.attempts ?? 1;

      return {
        ...old,
        sendCount: sends + 1,
        attemptsTotal: attempts + 1,
      };
    };

    const nextList = sessionKey
      ? await updateSessionItem(sessionKey, climbType, item.id, updater)
      : await updateDayItem(date, climbType, item.id, updater);

    if (nextList) {
      const updated = nextList.find((it) => it.id === itemId) ?? null;
      setItem(updated);
    }

    useLogsStore.getState().upsertCount({
      date,
      type: climbType,
      grade: item.grade,
      delta: 1,
    });

    await enqueueLogEvent({ type: "repeat", localId: item.id });

    if (!sessionKey && date) recalcIntensityForDate(date).catch(() => {});
  }, [item, sessionKey, climbType, date, itemId]);

  const s = useMemo(() => createStyles(colors), [colors]);

  if (!item) {
    return (
      <View style={s.container}>
        <Stack.Screen options={{ title: "Route Detail", headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} /> }} />
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
    <>
      <Stack.Screen options={{ title: "Route Detail", headerTransparent: true, scrollEdgeEffects: { top: "soft" }, headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} /> }} />
      <View style={s.container}>
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Media section - starts at top of screen, extends behind status bar + nav bar */}
        <View style={[s.mediaContainer, { height: SCREEN_W * 1.2 }]}>
          {media.length > 0 ? (
            <>
              <FlatList
                data={media}
                keyExtractor={(m) => m.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentInsetAdjustmentBehavior="never"
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                  setActiveMediaIndex(idx);
                }}
                renderItem={({ item: m }) => {
                  const coverUri = m.type === "video" ? (m.coverUri || m.uri) : m.uri;
                  return (
                    <Pressable
                      style={{ width: SCREEN_W, height: "100%" }}
                      onPress={() => {
                        if (m.type === "video") setPlayingVideoUri(m.uri);
                        else setPreviewImageUri(m.uri);
                      }}
                    >
                      {coverUri ? (
                        <Image source={{ uri: coverUri }} style={s.mediaImage} contentFit="cover" />
                      ) : (
                        <View style={[s.mediaImage, s.mediaPlaceholder]}>
                          <Ionicons name="image-outline" size={26} color={colors.textTertiary} />
                        </View>
                      )}
                      {m.type === "video" && (
                        <View style={s.playOverlay}>
                          <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.9)" />
                        </View>
                      )}
                    </Pressable>
                  );
                }}
              />
              {media.length > 1 && (
                <View style={s.dotsRow}>
                  {media.map((_, idx) => (
                    <View key={idx} style={[s.dot, idx === activeMediaIndex && s.dotActive]} />
                  ))}
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
            <View style={[s.tag, (styleLabel === "Flash" || styleLabel === "Onsight") && s.tagBolt]}>
              {(styleLabel === "Flash" || styleLabel === "Onsight") && (
                <Ionicons name="flash" size={11} color="#F59E0B" />
              )}
              <Text style={[s.tagText, (styleLabel === "Flash" || styleLabel === "Onsight") && s.tagBoltText]}>{styleLabel}</Text>
            </View>
          ) : null}
          {feelLabel ? (
            <View style={s.tagDark}>
              <Text style={s.tagDarkText}>{feelLabel.toUpperCase()}</Text>
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

        {/* History */}
        <View style={s.historySection}>
          <Text style={s.sectionTitle}>History</Text>
          <View style={s.historyRow}>
            <View style={s.historyCell}>
              <Text style={s.historyValue}>{history.sends}</Text>
              <Text style={s.historyLabel}>Sends</Text>
            </View>
            <View style={s.dividerV} />
            <View style={s.historyCell}>
              <Text style={s.historyValue}>{history.attemptsTotal}</Text>
              <Text style={s.historyLabel}>Attempts</Text>
            </View>
          </View>
        </View>

        {/* Repeat button */}
        <View style={s.actionsWrap}>
          <TouchableOpacity activeOpacity={0.85} style={s.repeatBtn} onPress={handleRepeat}>
            <Ionicons name="repeat" size={17} color={colors.pillText} />
            <Text style={s.repeatText}>Log Repeat</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <UploadProgressToast
        visible={uploading}
        progress={uploadProgress}
        onDismiss={() => setUploading(false)}
      />

      {/* Video player modal */}
      <Modal visible={!!playingVideoUri} animationType="fade" transparent onRequestClose={() => setPlayingVideoUri(null)}>
        {playingVideoUri ? (
          <VideoPlayerModal uri={playingVideoUri} onClose={() => setPlayingVideoUri(null)} topInset={insets.top} />
        ) : null}
      </Modal>

      {/* Image preview modal */}
      <Modal visible={!!previewImageUri} animationType="fade" transparent onRequestClose={() => setPreviewImageUri(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 60, right: 18, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
            onPress={() => setPreviewImageUri(null)}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: "92%", height: "55%", borderRadius: 18, overflow: "hidden", backgroundColor: "#000" }}>
            {previewImageUri ? (
              <Image source={{ uri: previewImageUri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
      </View>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={media.length > 0 ? "pencil" : "plus"}
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
        <Stack.Toolbar.Button
          icon="trash"
          onPress={handleDeleteLog}
        />
      </Stack.Toolbar>
    </>
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
      fontFamily: "DMSans_900Black",
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
      fontFamily: "DMSans_700Bold",
      color: colors.textPrimary,
    },
    dateText: {
      fontSize: 13,
      fontFamily: "DMSans_500Medium",
      color: colors.textSecondary,
      marginTop: 4,
    },

    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    tagBolt: {
      backgroundColor: "#FFFBEB",
      borderWidth: 1,
      borderColor: "#FBBF24",
    },
    tagBoltText: {
      color: "#B45309",
    },
    tagDark: {
      paddingHorizontal: 10,
      height: 30,
      borderRadius: 999,
      backgroundColor: colors.cardDark,
      alignItems: "center",
      justifyContent: "center",
    },
    tagDarkText: {
      fontSize: 11,
      fontFamily: "DMSans_900Black",
      color: "#FFFFFF",
      letterSpacing: 0.8,
      includeFontPadding: false,
    },
    tagText: {
      fontSize: 13,
      fontFamily: "DMSans_500Medium",
      color: colors.textSecondary,
    },

    noteSection: {
      padding: 20,
    },
    noteLabel: {
      fontSize: 14,
      fontFamily: "DMSans_700Bold",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    noteContent: {
      fontSize: 15,
      fontFamily: "DMSans_400Regular",
      color: colors.textPrimary,
      lineHeight: 22,
    },

    dotsRow: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 10,
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.45)",
    },
    dotActive: {
      backgroundColor: "rgba(255,255,255,0.92)",
    },

    historySection: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontFamily: "DMSans_700Bold",
      color: colors.textSecondary,
      marginBottom: 12,
    },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    historyCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 4,
    },
    dividerV: {
      width: 1,
      height: 36,
      backgroundColor: colors.divider,
    },
    historyLabel: {
      fontSize: 12,
      fontFamily: "DMSans_500Medium",
      color: colors.textTertiary,
      marginTop: 4,
    },
    historyValue: {
      fontSize: 22,
      fontFamily: "DMSans_900Black",
      color: colors.textPrimary,
    },
    actionsWrap: {
      marginTop: 20,
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    repeatBtn: {
      height: 54,
      borderRadius: 999,
      backgroundColor: colors.pillBackground,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    repeatText: {
      color: colors.pillText,
      fontFamily: "DMSans_700Bold",
      fontSize: 16,
    },

  });
