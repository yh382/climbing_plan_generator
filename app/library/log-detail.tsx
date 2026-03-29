// app/library/log-detail.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, FlatList, ActionSheetIOS } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { format, parseISO } from "date-fns";

import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";
import DualActivityRing from "../../src/features/journal/DualActivityRing";
import LogItemCard from "../../src/features/journal/loglist/LogItemCard";
import { usePlanStore } from "../../src/store/usePlanStore";
import useLogsStore from "../../src/store/useLogsStore";
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";
import { readDayList, readSessionList } from "../../src/features/journal/loglist/storage";
import { enqueueLogEvent } from "../../src/features/journal/sync/logsOutbox";
import { getSessionServerId as getSessionSId } from "../../src/features/journal/sync/sessionServerIdMap";
import { api } from "../../src/lib/apiClient";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useFavoriteGyms } from "../../src/features/gyms/hooks";
import { useSettings } from "../../src/contexts/SettingsContext";
import { setPendingMediaBatch } from "../../src/features/community/pendingMedia";
import type { PickedMediaItem } from "../../src/features/community/types";

const SIDE_PAD = 16;

const isBoulderGrade = (g?: string) => typeof g === "string" && /^V\d+/i.test(g.trim());
const isRouteGrade = (g?: string) => typeof g === "string" && /^5\./.test(g.trim());

function inferSendCount(item: any): number {
  if (typeof item?.sendCount === "number") return item.sendCount;
  const style = item?.style;
  if (style === "redpoint" || style === "flash" || style === "onsight") return 1;
  if (item?.isSent === true) return 1;
  if (item?.status === "sent" || item?.status === "send") return 1;
  return 0;
}

function vNumber(g?: string): number {
  if (!g) return -1;
  const m = String(g).trim().match(/^V(\d+)/i);
  return m ? parseInt(m[1], 10) : -1;
}

function ydsRank(g?: string): number {
  if (!g) return -1;
  const m = String(g).trim().match(/^5\.(\d+)([abcd+-])?$/i);
  if (!m) return -1;
  const major = parseInt(m[1], 10);
  const suf = (m[2] || "").toLowerCase();
  const sufMap: Record<string, number> = { "": 0, a: 1, b: 2, c: 3, d: 4, "+": 5, "-": -1 };
  return major * 10 + (sufMap[suf] ?? 0);
}

function gradeRank(g?: string): number {
  const v = vNumber(g);
  if (v >= 0) return v * 10 + 100;
  const y = ydsRank(g);
  if (y >= 0) return y;
  return -1;
}

function formatDuration(startTime: number, endTime: number): string {
  const diffMs = endTime - startTime;
  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  largeSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    marginHorizontal: SIDE_PAD,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  kpiItem: { flex: 1, alignItems: "center" },
  kpiValue: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  kpiLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600", marginTop: 2 },
  kpiDivider: { width: 1, height: 28, backgroundColor: colors.border },
});

export default function LogDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const labelOf = useCallback((g: string) => g, []);

  const params = useLocalSearchParams<{
    date?: string;
    origin?: string;
    gymName?: string;
    mode?: "boulder" | "toprope" | "lead" | "rope";
    sessionKey?: string;
  }>();

  const date = typeof params.date === "string" ? params.date : "";
  const origin = typeof params.origin === "string" ? params.origin : "";
  const sessionKey = typeof params.sessionKey === "string" ? params.sessionKey : "";
  const gymNameParam = typeof params.gymName === "string" ? params.gymName : "";
  const modeParam = params.mode;

  const { percentForDate } = usePlanStore();
  const sessions = useLogsStore((s) => s.sessions);
  const [trainingPct, setTrainingPct] = useState(0);

  const [itemsB, setItemsB] = useState<any[]>([]);
  const [itemsR, setItemsR] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [sessionServerId, setSessionServerId] = useState<string | null>(null);

  // Find matching session entry for duration info
  const sessionEntry = useMemo(() => {
    if (sessionKey) return sessions.find((s) => s.sessionKey === sessionKey) ?? null;
    if (date) return sessions.find((s) => s.date === date) ?? null;
    return null;
  }, [sessions, sessionKey, date]);

  // Compute duration from session entry
  const duration = useMemo(() => {
    if (sessionEntry?.duration) return sessionEntry.duration;
    if (sessionEntry?.startTime) {
      const start = typeof sessionEntry.startTime === "number"
        ? sessionEntry.startTime
        : new Date(sessionEntry.startTime).getTime();
      const end = sessionEntry.endTime
        ? (typeof sessionEntry.endTime === "number" ? sessionEntry.endTime : new Date(sessionEntry.endTime).getTime())
        : Date.now();
      return formatDuration(start, end);
    }
    return "";
  }, [sessionEntry]);

  // Fetch backend session for share/privacy features
  useEffect(() => {
    if (sessionEntry?.serverId) {
      setSessionServerId(sessionEntry.serverId);
      setIsPublic(sessionEntry.isPublic ?? false);
      return;
    }

    if (sessionKey) {
      getSessionSId(sessionKey).then((id) => {
        if (id) {
          setSessionServerId(id);
          api
            .get<any>(`/sessions/${id}`)
            .then((s) => setIsPublic(s?.visibility === "public"))
            .catch(() => {});
        }
      });
      return;
    }

    if (!date) return;
    api
      .get<any[]>(`/sessions/me?from=${date}&to=${date}`)
      .then((sessions) => {
        if (sessions?.length) {
          setSessionServerId(sessions[0].id);
          setIsPublic(sessions[0].visibility === "public");
        } else {
          setSessionServerId(null);
          setIsPublic(false);
        }
      })
      .catch(() => {
        setSessionServerId(null);
        setIsPublic(false);
      });
  }, [date, sessionKey, sessionEntry]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        if (!date && !sessionKey) return;

        let b: any[] = [];
        let topRope: any[] = [];
        let ld: any[] = [];

        if (sessionKey) {
          [b, topRope, ld] = await Promise.all([
            readSessionList(sessionKey, "boulder"),
            readSessionList(sessionKey, "toprope"),
            readSessionList(sessionKey, "lead"),
          ]);
        } else if (date) {
          [b, topRope, ld] = await Promise.all([
            readDayList(date, "boulder"),
            readDayList(date, "toprope"),
            readDayList(date, "lead"),
          ]);
        }

        if (cancelled) return;

        const bb = Array.isArray(b) ? b : [];
        const rr = [
          ...(Array.isArray(topRope) ? topRope : []),
          ...(Array.isArray(ld) ? ld : []),
        ];

        setItemsB(bb);
        setItemsR(rr);
      };

      load();
      return () => { cancelled = true; };
    }, [date, sessionKey])
  );

  // Sort by grade descending
  const dailyLogs = useMemo(
    () =>
      [...itemsB, ...itemsR].sort((a, b) => gradeRank(b?.grade) - gradeRank(a?.grade)),
    [itemsB, itemsR]
  );

  useEffect(() => {
    if (!date) return;
    try {
      percentForDate(parseISO(date)).then(setTrainingPct).catch(() => setTrainingPct(0));
    } catch {
      setTrainingPct(0);
    }
  }, [date, percentForDate]);

  const displayDate = useMemo(() => {
    if (!date) return "Unknown Date";
    try { return format(parseISO(date), "EEEE, MMM dd"); } catch { return date; }
  }, [date]);

  const gymName = useMemo(() => {
    if (gymNameParam) return gymNameParam;
    if (sessionEntry?.gymName) return sessionEntry.gymName;
    const first: any = dailyLogs[0];
    return first?.gymName || first?.gym || first?.location || "";
  }, [gymNameParam, sessionEntry, dailyLogs]);

  const { favorites: favGyms } = useFavoriteGyms();
  const gymId = useMemo(() => {
    if (!gymName) return undefined;
    const match = favGyms.find(g => g.name === gymName);
    return match?.gym_id;
  }, [gymName, favGyms]);

  const hasBoulder = useMemo(() => dailyLogs.some((l: any) => isBoulderGrade(l?.grade)), [dailyLogs]);
  const hasRoutes = useMemo(() => dailyLogs.some((l: any) => isRouteGrade(l?.grade)), [dailyLogs]);

  const boulderParts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of itemsB) {
      const g = String(it?.grade || "—").trim() || "—";
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries()).map(([grade, count]) => ({ grade, count, color: colorForBoulder(grade) }));
  }, [itemsB]);

  const routeParts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of itemsR) {
      const g = String(it?.grade || "—").trim() || "—";
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries()).map(([grade, count]) => ({ grade, count, color: colorForYDS(grade) }));
  }, [itemsR]);

  const boulderTotal = itemsB.length;
  const routeTotal = itemsR.length;
  const sessionSends = useMemo(() => dailyLogs.reduce((s: number, it: any) => s + inferSendCount(it), 0), [dailyLogs]);

  const bestGrade = useMemo(() => {
    if (sessionEntry?.best && sessionEntry.best !== "V?") return sessionEntry.best;
    const sorted = [...dailyLogs].sort((a, b) => gradeRank(b?.grade) - gradeRank(a?.grade));
    return sorted[0]?.grade || "—";
  }, [sessionEntry, dailyLogs]);

  // === Handlers ===

  const handleBack = () => {
    if (origin === "end_log") {
      router.replace("/calendar");
      return;
    }
    router.back();
  };

  const handleTogglePrivacy = async () => {
    if (!sessionKey) return;
    await useLogsStore.getState().toggleSessionPublic(sessionKey);
    const updated = useLogsStore.getState().sessions.find(
      (s) => s.sessionKey === sessionKey
    );
    if (updated) setIsPublic(updated.isPublic);
  };

  const handleShareToPost = async () => {
    if (!sessionEntry) return;

    // 1. Collect all uploaded media from session log items
    const allTypes = ["boulder", "toprope", "lead"] as const;
    const collected: PickedMediaItem[] = [];

    for (const t of allTypes) {
      const items = await readSessionList(sessionEntry.sessionKey, t);
      for (const item of items) {
        const media = Array.isArray(item.media) ? item.media : [];
        for (const m of media) {
          if (typeof m.uri === "string" && m.uri.startsWith("http")) {
            collected.push({
              id: m.id || `${item.id}-${m.uri}`,
              uri: m.uri,
              mediaType: m.type === "video" ? "video" : "image",
              width: 0,
              height: 0,
            });
          }
        }
      }
    }

    // 2. Check media limit
    const POST_MAX_MEDIA = 20;
    if (collected.length > POST_MAX_MEDIA) {
      Alert.alert(
        "Too many media",
        `Posts can have up to ${POST_MAX_MEDIA} media items. This session has ${collected.length}. The first ${POST_MAX_MEDIA} will be included.`,
      );
    }
    const mediaToShare = collected.slice(0, POST_MAX_MEDIA);

    // 3. Set pending media for create.tsx to consume
    if (mediaToShare.length > 0) {
      setPendingMediaBatch(mediaToShare);
    }

    // 4. Navigate to create with session attachment params
    const durationStr = duration || "";
    router.push({
      pathname: "/community/create",
      params: {
        prefillAttachType: "session",
        prefillAttachId: sessionServerId || "",
        prefillAttachTitle: `${sessionEntry.gymName || gymName || "Climbing Session"} · ${displayDate}`,
        prefillAttachSubtitle: `${sessionSends} sends · ${bestGrade} · ${durationStr}`,
        source: "log-detail",
      },
    });
  };

  const handleShareVia = async () => {
    const lines = dailyLogs.length > 0
      ? dailyLogs.slice(0, 5).map((l: any) => `${l.grade || '—'}`).join(', ')
      : 'No logs';
    await Share.share({
      message: `Route Log · ${displayDate}\n${gymName ? gymName + '\n' : ''}${sessionSends} sends · Best: ${bestGrade}${duration ? ' · ' + duration : ''}\n${lines}`,
    });
  };

  const handleDeleteSession = () => {
    Alert.alert("Delete", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const itemIds = await useLogsStore.getState().deleteSession(sessionKey);
          for (const id of itemIds) {
            await enqueueLogEvent({ type: "delete", localId: id });
          }
          router.back();
        },
      },
    ]);
  };

  const handleEditMedia = () => {
    Alert.alert("Coming soon", "Edit media for sessions is coming in a future update.");
  };

  // ActionSheetIOS menu (replaces SmartBottomSheet)
  const showMenu = () => {
    const hasPrivacyToggle = !!(sessionServerId || sessionKey);
    const options = [
      ...(hasPrivacyToggle ? [isPublic ? "Make Private" : "Make Public"] : []),
      "Share to Post",
      "Share via...",
      "Edit Media",
      "Delete Session",
      "Cancel",
    ];
    const destructiveIndex = options.indexOf("Delete Session");
    const cancelIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex: destructiveIndex,
        cancelButtonIndex: cancelIndex,
      },
      (buttonIndex) => {
        const label = options[buttonIndex];
        if (label === "Make Private" || label === "Make Public") handleTogglePrivacy();
        else if (label === "Share to Post") handleShareToPost();
        else if (label === "Share via...") handleShareVia();
        else if (label === "Edit Media") handleEditMedia();
        else if (label === "Delete Session") handleDeleteSession();
      }
    );
  };

  // === Render helpers ===

  const renderLogCard = ({ item }: { item: any }) => (
    <LogItemCard
      item={item}
      labelOf={labelOf}
      note={(item.note || "").trim() || undefined}
      tr={tr}
      onPress={() => {
        router.push({
          pathname: "/library/route-detail",
          params: {
            date,
            itemId: item.id,
            type: item.type,
            sessionKey,
          },
        });
      }}
    />
  );

  // Infer display mode from param or data
  const effectiveMode = useMemo(() => {
    if (modeParam === "boulder") return "boulder";
    if (modeParam === "toprope" || modeParam === "lead" || modeParam === "rope") return "route";
    if (hasBoulder && !hasRoutes) return "boulder";
    if (hasRoutes && !hasBoulder) return "route";
    return "boulder";
  }, [modeParam, hasBoulder, hasRoutes]);

  const activeParts = useMemo(() => {
    return effectiveMode === "boulder" ? boulderParts : routeParts;
  }, [effectiveMode, boulderParts, routeParts]);

  const activeTotal = useMemo(() => {
    return effectiveMode === "boulder" ? boulderTotal : routeTotal;
  }, [effectiveMode, boulderTotal, routeTotal]);

  const ring = (
    <DualActivityRing
      size={170}
      thickness={14}
      trainingPct={trainingPct}
      climbCount={activeTotal}
      parts={activeParts.length ? activeParts : []}
      climbGoal={10}
      outerColor="#A08060"
      innerColor="#306E6F"
      duration={duration}
    />
  );

  const kpiRow = (
    <View style={styles.kpiRow}>
      <View style={styles.kpiItem}>
        <Text style={styles.kpiValue}>{sessionSends}</Text>
        <Text style={styles.kpiLabel}>Sends</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={styles.kpiItem}>
        <Text style={styles.kpiValue}>{bestGrade}</Text>
        <Text style={styles.kpiLabel}>Best</Text>
      </View>
      {duration ? (
        <>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{duration}</Text>
            <Text style={styles.kpiLabel}>Duration</Text>
          </View>
        </>
      ) : null}
      <View style={styles.kpiDivider} />
      <View style={styles.kpiItem}>
        <Text style={styles.kpiValue}>{dailyLogs.length}</Text>
        <Text style={styles.kpiLabel}>Climbs</Text>
      </View>
    </View>
  );

  const listHeader = (
    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
      {ring}
      <View style={{ height: 12 }} />
      {kpiRow}
      <View style={{ height: 12 }} />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{
        ...NATIVE_HEADER_LARGE,
        headerTransparent: true,
        scrollEdgeEffects: { top: "soft" },
        title: gymName || tr("训练详情", "Session Details"),
        headerLeft: () => <HeaderButton icon="chevron.backward" onPress={handleBack} />,
        headerRight: () => <HeaderButton icon="ellipsis" onPress={showMenu} />,
      }} />
      <FlatList
        style={{ backgroundColor: colors.backgroundSecondary }}
        data={dailyLogs}
        keyExtractor={(item: any, index: number) => item.id || index.toString()}
        renderItem={renderLogCard}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.largeSubtitle}>{displayDate}</Text>
                {sessionServerId && (
                  <Ionicons
                    name={isPublic ? "globe-outline" : "lock-closed-outline"}
                    size={12}
                    color={colors.textSecondary}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              {gymName ? (
                gymId ? (
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/(tabs)/community', params: { tab: 'gyms', gymId } })}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={12} color={colors.accent} />
                    <Text style={{ fontSize: 12, color: colors.accent }}>{gymName}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{gymName}</Text>
                  </View>
                )
              ) : null}
            </View>
            {listHeader}
          </>
        }
        contentContainerStyle={{ paddingBottom: 8 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
