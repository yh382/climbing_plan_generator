// app/library/log-detail.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share, FlatList } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { format, parseISO } from "date-fns";

import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";
import DualActivityRing from "../../src/features/journal/DualActivityRing";
import ClimbItemCard from "../../src/components/shared/ClimbItemCard";
import SmartBottomSheet from "../../src/features/community/components/SmartBottomSheet";
import { usePlanStore } from "../../src/store/usePlanStore";
import useLogsStore from "../../src/store/useLogsStore";
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";
import { readDayList, readSessionList } from "../../src/features/journal/loglist/storage";
import { enqueueLogEvent } from "../../src/features/journal/sync/logsOutbox";
import { getSessionServerId as getSessionSId, setSessionServerId as setSessionSId, readAllSessionServerIds as readAllSessionSIds } from "../../src/features/journal/sync/sessionServerIdMap";
import { flushSessionsOutbox } from "../../src/features/journal/sync/sessionsOutbox";
import { api } from "../../src/lib/apiClient";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useFavoriteGyms } from "../../src/features/gyms/hooks";

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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconBtnInner: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  largeTitle: { fontSize: 32, fontWeight: "800", color: colors.textPrimary, lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  // KPI row
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

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});

export default function LogDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [sessionServerId, setSessionServerId] = useState<string | null>(null);

  // Find matching session entry for duration info
  const sessionEntry = useMemo(() => {
    if (sessionKey) return sessions.find((s) => s.sessionKey === sessionKey) ?? null;
    if (date) return sessions.find((s) => s.date === date) ?? null;
    return null;
  }, [sessions, sessionKey, date]);

  // Fetch backend session for share/privacy features
  useEffect(() => {
    // 1. store 中已有 serverId (V7 新字段)
    if (sessionEntry?.serverId) {
      setSessionServerId(sessionEntry.serverId);
      setIsPublic(sessionEntry.isPublic ?? false);
      return;
    }

    // 2. 查 sessionServerIdMap (AsyncStorage 持久化)
    if (sessionKey) {
      getSessionSId(sessionKey).then((id) => {
        if (id) {
          setSessionServerId(id);
          // 从后端获取 visibility
          api
            .get<any>(`/sessions/${id}`)
            .then((s) => setIsPublic(s?.visibility === "public"))
            .catch(() => {});
        }
      });
      return;
    }

    // 3. 兜底: date 查询 (兼容 V7 前的老数据)
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
        let tr: any[] = [];
        let ld: any[] = [];

        if (sessionKey) {
          [b, tr, ld] = await Promise.all([
            readSessionList(sessionKey, "boulder"),
            readSessionList(sessionKey, "toprope"),
            readSessionList(sessionKey, "lead"),
          ]);
        } else if (date) {
          [b, tr, ld] = await Promise.all([
            readDayList(date, "boulder"),
            readDayList(date, "toprope"),
            readDayList(date, "lead"),
          ]);
        }

        if (cancelled) return;

        const bb = Array.isArray(b) ? b : [];
        const rr = [
          ...(Array.isArray(tr) ? tr : []),
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

  // Resolve gymName → gymId for clickable navigation
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

  const duration = sessionEntry?.duration || "";

  const handleBack = () => {
    if (origin === "end_log") {
      router.replace("/calendar");
      return;
    }
    router.back();
  };

  const handleMenu = () => setMenuVisible(true);

  const handleTogglePrivacy = async () => {
    setMenuVisible(false);
    if (!sessionKey) return;
    await useLogsStore.getState().toggleSessionPublic(sessionKey);
    // 从 store 重新读取状态 (乐观更新已生效)
    const updated = useLogsStore.getState().sessions.find(
      (s) => s.sessionKey === sessionKey
    );
    if (updated) setIsPublic(updated.isPublic);
  };

  const handleShareToPost = async () => {
    setMenuVisible(false);
    let serverId = sessionServerId;

    // If no serverId yet, try to flush outbox & resolve
    if (!serverId && sessionKey) {
      try {
        const sMap = await readAllSessionSIds();
        await flushSessionsOutbox({
          resolveServerId: (k) => sMap[k] ?? null,
          saveServerId: async (k, id) => { await setSessionSId(k, id); sMap[k] = id; },
        });
        serverId = sMap[sessionKey] || (await getSessionSId(sessionKey));
      } catch {}
    }

    // Still no serverId → try date-based lookup from backend (match by start_time)
    if (!serverId && date && sessionEntry) {
      try {
        const sessions = await api.get<any[]>(`/sessions/me?from=${date}&to=${date}`);
        if (sessions?.length) {
          const localStart = new Date(sessionEntry.startTime).getTime();
          const match = sessions.find((s: any) => {
            const sStart = new Date(s.start_time).getTime();
            return Math.abs(sStart - localStart) < 120000; // within 2 minutes
          });
          if (match) {
            serverId = match.id;
            if (sessionKey) await setSessionSId(sessionKey, serverId!);
          }
        }
      } catch {}
    }

    // Still no serverId → create session on backend directly with historical timestamps
    if (!serverId && sessionEntry) {
      try {
        const res = await api.post<{ id: string }>('/sessions', {
          gym_name: sessionEntry.gymName,
          location_type: 'gym',
          start_time: sessionEntry.startTime,
          end_time: sessionEntry.endTime,
        });
        if (res?.id) {
          serverId = String(res.id);
          if (sessionKey) await setSessionSId(sessionKey, serverId);
          // Update store
          const allSessions = useLogsStore.getState().sessions;
          useLogsStore.setState({
            sessions: allSessions.map((s) =>
              s.sessionKey === sessionEntry.sessionKey
                ? { ...s, serverId, synced: true }
                : s
            ),
          });
        }
      } catch {}
    }

    if (serverId) {
      setSessionServerId(serverId);
      router.push({
        pathname: '/community/media-select',
        params: {
          sessionId: serverId,
          date,
          localGymName: sessionEntry?.gymName || gymNameParam || '',
          localSends: String(sessionEntry?.sends ?? 0),
          localBest: sessionEntry?.best || '',
          localDuration: sessionEntry?.duration || '',
        },
      });
    } else {
      Alert.alert('Sync Required', 'This session has not been synced to the server yet. Please check your network and try again.');
    }
  };

  const handleShareVia = () => {
    setMenuVisible(false);
    // Delay to let SmartBottomSheet dismiss before presenting system share sheet
    setTimeout(async () => {
      const lines = dailyLogs.length > 0
        ? dailyLogs.slice(0, 5).map((l: any) => `${l.grade || '—'}`).join(', ')
        : 'No logs';
      await Share.share({
        message: `Route Log · ${displayDate}\n${gymName ? gymName + '\n' : ''}${sessionSends} sends · Best: ${bestGrade}${duration ? ' · ' + duration : ''}\n${lines}`,
      });
    }, 400);
  };

  const handleDeleteSession = () => {
    setMenuVisible(false);
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

  const renderClimbCard = ({ item }: { item: any }) => (
    <ClimbItemCard
      item={item}
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

  // Infer display mode from param or data (fixes ring TOTAL 0 when mode not passed)
  const effectiveMode = useMemo(() => {
    if (modeParam === "boulder") return "boulder";
    if (modeParam === "toprope" || modeParam === "lead" || modeParam === "rope") return "route";
    // No mode param → infer from actual data
    if (hasBoulder && !hasRoutes) return "boulder";
    if (hasRoutes && !hasBoulder) return "route";
    return "boulder"; // mixed → default boulder
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

  const LeftActions = (
    <HeaderButton icon="chevron.backward" onPress={handleBack} />
  );

  const RightActions = (
    <HeaderButton icon="ellipsis" onPress={handleMenu} />
  );

  return (
    <>
      <Stack.Screen options={{
        ...NATIVE_HEADER_LARGE,
        title: "Route Log",
        headerLeft: () => LeftActions,
        headerRight: () => RightActions,
      }} />
      <FlatList
        style={{ backgroundColor: colors.backgroundSecondary }}
        data={dailyLogs}
        keyExtractor={(item: any, index: number) => item.id || index.toString()}
        renderItem={renderClimbCard as any}
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

      <SmartBottomSheet visible={menuVisible} onClose={() => setMenuVisible(false)} mode="menu">
        {(sessionServerId || sessionKey) && (
          <TouchableOpacity style={styles.menuRow} onPress={handleTogglePrivacy}>
            <Ionicons name={isPublic ? "eye-outline" : "eye-off-outline"} size={20} color={colors.textPrimary} />
            <Text style={styles.menuRowText}>{isPublic ? "Make Private" : "Make Public"}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.menuRow} onPress={handleShareToPost}>
          <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.menuRowText}>Share to Post</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={handleShareVia}>
          <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.menuRowText}>Share via...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuRow} onPress={handleDeleteSession}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.menuRowText, { color: '#EF4444' }]}>Delete Session</Text>
        </TouchableOpacity>
      </SmartBottomSheet>
    </>
  );
}
