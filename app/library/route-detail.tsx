// app/library/route-detail.tsx
import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import TopBar from "../../components/TopBar";
import { getColorForGrade } from "../../lib/gradeColors";
import {
  readDayList,
  readSessionList,
} from "../../src/features/journal/loglist/storage";
import type { LocalDayLogItem } from "../../src/features/journal/loglist/types";

const SCREEN_W = Dimensions.get("window").width;

export default function RouteDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { date, itemId, type, sessionKey } = useLocalSearchParams<{
    date: string;
    itemId: string;
    type: string;
    sessionKey?: string;
  }>();

  const [item, setItem] = useState<LocalDayLogItem | null>(null);

  useEffect(() => {
    if (!date || !itemId) return;
    let cancelled = false;

    const load = async () => {
      const climbType = (type === "toprope" || type === "lead") ? type : "boulder";
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
  }, [date, itemId, type, sessionKey]);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF" }}>
        <View style={{ paddingTop: insets.top }}>
          <TopBar
            routeName="route_detail"
            title="Route"
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }}
          />
        </View>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons name="alert-circle-outline" size={44} color="#E5E7EB" />
          <Text style={{ color: "#9CA3AF", marginTop: 8 }}>
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

  // Get media
  const mediaUri =
    item.media?.[0]?.uri || item.imageUri || item.videoUri || "";
  const isVideo = item.media?.[0]?.type === "video" || !!item.videoUri;

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
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar
          routeName="route_detail"
          title="Route"
          useSafeArea={false}
          leftControls={{ mode: "back", onBack: () => router.back() }}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Media section - always visible */}
        <View style={styles.mediaContainer}>
          {mediaUri ? (
            <>
              <Image
                source={{ uri: mediaUri }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              {isVideo && (
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.9)" />
                </View>
              )}
            </>
          ) : (
            <View style={styles.mediaPlaceholder}>
              <Ionicons name="camera-outline" size={44} color="#D1D5DB" />
            </View>
          )}
        </View>

        {/* Route info */}
        <View style={styles.infoSection}>
          <Text style={styles.routeName}>{routeName}</Text>

          <View style={styles.gradeRow}>
            <View style={[styles.gradeDot, { backgroundColor: gc }]} />
            <Text style={styles.gradeText}>{item.grade}</Text>
          </View>

          {displayDate ? (
            <Text style={styles.dateText}>{displayDate}</Text>
          ) : null}
        </View>

        {/* Tags row */}
        <View style={styles.tagsRow}>
          {styleLabel ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{styleLabel}</Text>
            </View>
          ) : null}
          {feelLabel ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{feelLabel}</Text>
            </View>
          ) : null}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{attempts}x</Text>
          </View>
        </View>

        {/* Notes */}
        {note ? (
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Notes</Text>
            <Text style={styles.noteContent}>{note}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaContainer: {
    width: SCREEN_W,
    height: SCREEN_W * 0.65,
    backgroundColor: "#F3F4F6",
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
    borderBottomColor: "#F3F4F6",
  },
  routeName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111",
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
    color: "#374151",
  },
  dateText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },

  noteSection: {
    padding: 20,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
});
