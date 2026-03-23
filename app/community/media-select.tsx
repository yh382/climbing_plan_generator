// app/community/media-select.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { api } from "../../src/lib/apiClient";

type MediaItem = {
  id: string;
  url: string;
  thumbnail: string;
  type: "image" | "video";
  duration?: string;
};

const MAX_SELECT = 10;
const itemSize = (Dimensions.get("window").width - 4) / 3;

export default function MediaSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sessionId, date, localGymName, localSends, localBest, localDuration } =
    useLocalSearchParams<{
      sessionId: string;
      date: string;
      localGymName?: string;
      localSends?: string;
      localBest?: string;
      localDuration?: string;
    }>();

  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<{
    gymName: string;
    sends: number;
    bestGrade: string;
    duration: string;
  }>({
    gymName: localGymName || "—",
    sends: localSends ? parseInt(localSends, 10) || 0 : 0,
    bestGrade: localBest || "—",
    duration: localDuration || "—",
  });

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      const session = await api.get<any>(`/sessions/public/${sessionId}`);

      // Only override local data if backend has better info
      const backendSends = session.totalSends || 0;
      if (backendSends > 0 || !localSends) {
        setSessionInfo({
          gymName: session.gymName || localGymName || "—",
          sends: backendSends,
          bestGrade: session.bestGrade || localBest || "—",
          duration: session.durationMinutes
            ? `${session.durationMinutes}m`
            : localDuration || "—",
        });
      }

      const media: MediaItem[] = [];
      for (const log of session.logs || []) {
        for (const m of log.media || []) {
          media.push({
            id: `${log.id}-${m.url}`,
            url: m.url,
            thumbnail: m.thumbUrl || m.url,
            type: m.type || "image",
            duration: m.duration,
          });
        }
      }
      setAllMedia(media);
    } catch (e) {
      // Session may not have media — local data already set
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECT) {
        next.add(id);
      }
      return next;
    });
  };

  const handleNext = () => {
    const selectedUrls = allMedia
      .filter((m) => selectedIds.has(m.id))
      .map((m) => m.url);

    const dateLabel = date || "—";

    router.push({
      pathname: "/community/create",
      params: {
        prefillMedia: JSON.stringify(selectedUrls),
        prefillAttachType: "session",
        prefillAttachId: sessionId!,
        prefillAttachTitle: `${sessionInfo?.gymName} · ${dateLabel}`,
        prefillAttachSubtitle: `${sessionInfo?.sends} sends · ${sessionInfo?.bestGrade} · ${sessionInfo?.duration}`,
      },
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Media</Text>
        <TouchableOpacity
          onPress={handleNext}
          disabled={selectedIds.size === 0}
          style={{ opacity: selectedIds.size > 0 ? 1 : 0.4 }}
        >
          <Text style={styles.nextBtn}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={styles.hint}>
        Select up to {MAX_SELECT} media to share · {selectedIds.size}/
        {MAX_SELECT}
      </Text>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : allMedia.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 14, color: colors.textTertiary }}>
            No media in this session
          </Text>
          <TouchableOpacity
            onPress={handleNext}
            style={{ marginTop: 16 }}
          >
            <Text style={styles.nextBtn}>Share without media</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allMedia}
          numColumns={3}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);
            const disabled = !selected && selectedIds.size >= MAX_SELECT;
            return (
              <TouchableOpacity
                onPress={() => toggleSelect(item.id)}
                disabled={disabled}
                style={[styles.gridItem, { width: itemSize, height: itemSize }]}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={StyleSheet.absoluteFill}
                />

                {disabled && <View style={styles.disabledOverlay} />}

                {selected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={11} color="#fff" />
                  </View>
                )}

                {item.type === "video" && item.duration && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    nextBtn: {
      fontSize: 15,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
      color: "#306E6F",
    },
    hint: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    gridItem: {
      margin: 0.5,
    },
    disabledOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    checkBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#306E6F",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "#fff",
    },
    durationBadge: {
      position: "absolute",
      bottom: 5,
      right: 5,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    durationText: {
      color: "#fff",
      fontSize: 10,
      fontFamily: theme.fonts.monoMedium,
    },
  });
