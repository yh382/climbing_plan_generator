import React, { useEffect, useMemo, useState } from "react";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../../components/ui/HeaderButton";
import { VideoView, useVideoPlayer } from "expo-video";

import type { LocalDayLogItem, LogMedia } from "./types";
import {
  readDayList,
  updateDayItem,
  deleteDayItem,
  readSessionList,
  updateSessionItem,
  deleteSessionItem,
} from "./storage";
import { enqueueLogEvent } from "../sync/logsOutbox";
import useLogsStore from "../../../store/useLogsStore";

type Params = { id?: string; date?: string; logType?: "boulder" | "toprope" | "lead"; sessionKey?: string };

function VideoPlayerModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const colors = useThemeColors();
  const vStyles = useMemo(() => createStyles(colors), [colors]);
  const player = useVideoPlayer({ uri }, (p) => { p.play(); });
  return (
    <View style={vStyles.playerOverlay}>
      <TouchableOpacity style={vStyles.playerClose} onPress={onClose} activeOpacity={0.85}>
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>
      <View style={vStyles.playerBox}>
        <VideoView player={player} style={{ width: "100%", height: "100%" }} nativeControls contentFit="contain" />
      </View>
    </View>
  );
}

const SCREEN_W = Dimensions.get("window").width;

function ensureMedia(item: LocalDayLogItem): LogMedia[] {
  // ✅ migrate legacy fields to media[]
  const arr: LogMedia[] = Array.isArray(item.media) ? item.media : [];

  // legacy image
  if (item.imageUri && !arr.some((m) => m.uri === item.imageUri)) {
    arr.push({ id: `img_${item.createdAt}`, type: "image", uri: item.imageUri });
  }

  // legacy video
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

export default function LogItemDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<Params>();

  const id = typeof params.id === "string" ? params.id : "";
  const date = typeof params.date === "string" ? params.date : "";
  const logType = params.logType || "boulder";
  const sessionKey = typeof params.sessionKey === "string" ? params.sessionKey : "";

  const [items, setItems] = useState<LocalDayLogItem[]>([]);
  const [playingVideoUri, setPlayingVideoUri] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = sessionKey
        ? await readSessionList(sessionKey, logType)
        : await readDayList(date, logType);

      if (!cancelled) setItems(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, logType, sessionKey]);

  const item = useMemo(() => items.find((x) => x.id === id), [items, id]);

  // ✅ per-item history (NOT grouped)
  const history = useMemo(() => {
    if (!item) return { sends: 0, attemptsTotal: 0, boltLabel: null as null | "Flash" | "Onsight" };

    const boltLabel = item.style === "flash" ? "Flash" : item.style === "onsight" ? "Onsight" : null;

    // ✅ flash/onsight/redpoint all count as a send
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

  const media = useMemo(() => (item ? ensureMedia(item) : []), [item]);

  const onPressMedia = (m: LogMedia) => {
    if (m.type === "video") {
      setPlayingVideoUri(m.uri);
      return;
    }
    setPreviewImageUri(m.uri);
  };

  const handleRepeat = async () => {
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
      ? await updateSessionItem(sessionKey, logType, item.id, updater)
      : await updateDayItem(date, logType, item.id, updater);

    if (nextList) setItems(nextList);

    // ✅ enqueue outbox event (offline-first; backend sync later)
    await enqueueLogEvent({ type: "repeat", localId: item.id });
  };

  const handleDelete = async () => {
    if (!item) return;

    Alert.alert("Delete log?", "This will remove this log item permanently (local).", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = sessionKey
            ? await deleteSessionItem(sessionKey, logType, item.id)
            : await deleteDayItem(date, logType, item.id);

          if (next) setItems(next);

          // Sync Zustand logs (keeps calendar rings accurate)
          const sends = typeof item.sendCount === "number" ? item.sendCount : 1;
          if (sends > 0) {
            useLogsStore.getState().upsertCount({
              date,
              type: logType,
              grade: item.grade,
              delta: -sends,
            });
          }

          // ✅ enqueue outbox event (offline-first; backend sync later)
          await enqueueLogEvent({ type: "delete", localId: item.id });

          router.back();
        },
      },
    ]);
  };

  const pickMedia = async (_kind: "image" | "video") => {
    setMenuOpen(false);

    // TODO: 接入真实 media picker（image / video）
    Alert.alert("Add media", "Media upload is not enabled yet.\nThis will be available in a later version.");
  };

  const handleAddMedia = () => {
    Alert.alert("Add media", "Choose media type", [
      { text: "Photo", onPress: () => pickMedia("image") },
      { text: "Video", onPress: () => pickMedia("video") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ padding: 16, paddingTop: 52 }}>
          <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
          <Text style={{ marginTop: 12, color: colors.chartLabel, fontWeight: "700" }}>Log not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ✅ 顶部媒体区域：可横滑 + dots */}
      <View style={styles.coverWrap}>
        {media.length > 0 ? (
          <>
            <FlatList
              data={media}
              keyExtractor={(m) => m.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                setActiveMediaIndex(idx);
              }}
              renderItem={({ item: m }) => {
                const coverUri = m.type === "video" ? m.coverUri : m.uri;
                return (
                  <Pressable style={{ width: SCREEN_W, height: "100%" }} onPress={() => onPressMedia(m)}>
                    {coverUri ? (
                      <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
                    ) : (
                      <View style={[styles.cover, styles.defaultCover]}>
                        <Ionicons name="image-outline" size={26} color="#CBD5E1" />
                        <Text style={{ marginTop: 8, color: "#94A3B8", fontWeight: "800" }}>No thumbnail</Text>
                      </View>
                    )}

                    {m.type === "video" ? (
                      <View style={styles.playBadge}>
                        <Ionicons name="play" size={16} color="#fff" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />

            {/* dots */}
            <View style={styles.dotsRow}>
              {media.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === activeMediaIndex && styles.dotActive]} />
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.cover, styles.defaultCover]}>
            <Ionicons name="image-outline" size={26} color="#CBD5E1" />
            <Text style={{ marginTop: 8, color: "#94A3B8", fontWeight: "800" }}>No media</Text>
          </View>
        )}

        {/* ✅ topbar：左返回 / 右分享（中间无文字） */}
        <View style={styles.topbar}>
          <HeaderButton icon="chevron.backward" onPress={() => router.back()} />

          <View style={{ flex: 1 }} />

          <HeaderButton icon="square.and.arrow.up" onPress={() => {}} />
        </View>
      </View>

      {/* 信息栏 */}
      <View style={styles.infoBlock}>
        <Text style={styles.routeName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.gradeText}>{item.grade}</Text>
      </View>

      {/* ✅ Note bubble 在 History 上面 */}
      {item.note ? (
        <View style={styles.noteBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#64748B" />
          <Text style={styles.noteText} numberOfLines={3}>
            {item.note}
          </Text>
        </View>
      ) : null}

      {/* History 卡片：只 Sends / Attempts，右侧 bolt badge */}
      <View style={styles.historyCard}>
        <View style={styles.historyTitleRow}>
          <Text style={styles.cardTitle}>History</Text>

          {history.boltLabel ? (
            <View style={styles.boltBadge}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
              <Text style={styles.boltBadgeText}>{history.boltLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.historyRowTwo}>
          <View style={styles.historyCellTwo}>
            <View style={styles.historyLabelRow}>
              <Ionicons name="flame-outline" size={14} color="#94A3B8" />
              <Text style={styles.historyLabel}>Sends</Text>
            </View>
            <Text style={styles.historyValue}>{history.sends}</Text>
          </View>

          <View style={styles.dividerV} />

          <View style={styles.historyCellTwo}>
            <View style={styles.historyLabelRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#94A3B8" />
              <Text style={styles.historyLabel}>Attempts</Text>
            </View>
            <Text style={styles.historyValue}>{history.attemptsTotal}</Text>
          </View>
        </View>
      </View>

      {/* ✅ 操作区：repeat + 三点菜单 */}
      <View style={styles.actionsWrap}>
        <View style={styles.actionsRow}>
          <TouchableOpacity activeOpacity={0.9} style={styles.repeatBtn} onPress={handleRepeat}>
            <Ionicons name="repeat" size={18} color="#fff" />
            <Text style={styles.repeatText}>Log Repeat</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} style={styles.moreBtn} onPress={() => setMenuOpen((v) => !v)}>
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {menuOpen ? (
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.85} onPress={handleAddMedia}>
              <Ionicons name="add-circle-outline" size={18} color={colors.textPrimary} />
              <Text style={styles.menuText}>Add media</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.85} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={[styles.menuText, { color: "#DC2626" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* video modal */}
      <Modal
        visible={!!playingVideoUri}
        animationType="fade"
        transparent
        onRequestClose={() => setPlayingVideoUri(null)}
      >
        {playingVideoUri ? (
          <VideoPlayerModal uri={playingVideoUri} onClose={() => setPlayingVideoUri(null)} />
        ) : null}
      </Modal>

      {/* image preview modal */}
      <Modal visible={!!previewImageUri} animationType="fade" transparent onRequestClose={() => setPreviewImageUri(null)}>
        <View style={styles.playerOverlay}>
          <TouchableOpacity style={styles.playerClose} onPress={() => setPreviewImageUri(null)} activeOpacity={0.85}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={styles.playerBox}>
            {previewImageUri ? (
              <Image source={{ uri: previewImageUri }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  coverWrap: { height: 340, backgroundColor: colors.backgroundSecondary },
  cover: { width: "100%", height: "100%" },
  defaultCover: { alignItems: "center", justifyContent: "center" },

  topbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 52,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  topbarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.9)",
  },

  playBadge: {
    position: "absolute",
    right: 14,
    bottom: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.85)",
    alignItems: "center",
    justifyContent: "center",
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { backgroundColor: "rgba(255,255,255,0.92)" },

  infoBlock: { paddingHorizontal: 16, paddingTop: 14 },
  routeName: { fontSize: 22, fontWeight: "900", color: colors.textPrimary, letterSpacing: -0.3 },
  gradeText: { marginTop: 6, color: colors.chartLabel, fontWeight: "800" },

  noteBubble: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: { flex: 1, color: colors.chartValue, fontSize: 13, fontWeight: "700", lineHeight: 18 },

  historyCard: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  historyTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },

  boltBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FBBF24",
    backgroundColor: "#FFFBEB",
  },
  boltBadgeText: { fontSize: 12, fontWeight: "900", color: "#B45309", letterSpacing: 0.2 },

  historyRowTwo: { flexDirection: "row", alignItems: "center" },
  historyCellTwo: { flex: 1, alignItems: "center" },
  dividerV: { width: 1, height: 44, backgroundColor: colors.cardBorder, marginHorizontal: 10 },
  historyLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyLabel: { fontSize: 12, fontWeight: "800", color: colors.chartLabel },
  historyValue: { marginTop: 8, fontSize: 18, fontWeight: "900", color: colors.textPrimary },

  actionsWrap: { marginTop: 14, paddingHorizontal: 16, position: "relative" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  repeatBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.pillBackground,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  repeatText: { color: colors.pillText, fontWeight: "900", fontSize: 14 },

  moreBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  menu: {
    position: "absolute",
    right: 16,
    top: 62,
    width: 180,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    paddingVertical: 8,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  menuText: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  menuDivider: { height: 1, backgroundColor: colors.cardBorder, marginHorizontal: 10 },

  playerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  playerBox: { width: "92%", height: "55%", borderRadius: 18, overflow: "hidden", backgroundColor: "#000" },
  playerClose: {
    position: "absolute",
    top: 60,
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
