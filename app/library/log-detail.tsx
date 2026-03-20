// app/library/log-detail.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import CollapsibleLargeHeaderFlatList from "../../src/components/CollapsibleLargeHeaderFlatList";
import DualActivityRing from "../../src/features/journal/DualActivityRing";
import ClimbItemCard from "../../src/components/shared/ClimbItemCard";
import { usePlanStore } from "../../src/store/usePlanStore";
import useLogsStore from "../../src/store/useLogsStore";
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";
import { readDayList, readSessionList } from "../../src/features/journal/loglist/storage";
import { enqueueLogEvent } from "../../src/features/journal/sync/logsOutbox";

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

export default function LogDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    date?: string;
    origin?: string;
    gymName?: string;
    mode?: "boulder" | "rope";
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

  // Find matching session entry for duration info
  const sessionEntry = useMemo(() => {
    if (sessionKey) return sessions.find((s) => s.sessionKey === sessionKey) ?? null;
    if (date) return sessions.find((s) => s.date === date) ?? null;
    return null;
  }, [sessions, sessionKey, date]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!date && !sessionKey) return;

      const useSession = !!sessionKey;

      const [b, tr, ld] = await Promise.all([
        useSession ? readSessionList(sessionKey, "boulder") : readDayList(date, "boulder"),
        useSession ? readSessionList(sessionKey, "toprope") : readDayList(date, "toprope"),
        useSession ? readSessionList(sessionKey, "lead") : readDayList(date, "lead"),
      ]);

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
  }, [date, sessionKey]);

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

  const handleMenu = () => {
    Alert.alert("Session Options", undefined, [
      {
        text: "Delete Session",
        style: "destructive",
        onPress: () => {
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
        },
      },
      { text: "Cancel", style: "cancel" },
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

  const activeParts = useMemo(() => {
    if (modeParam === "rope" || (hasRoutes && !hasBoulder)) return routeParts;
    return boulderParts;
  }, [modeParam, hasBoulder, hasRoutes, boulderParts, routeParts]);

  const activeTotal = useMemo(() => {
    if (modeParam === "rope" || (hasRoutes && !hasBoulder)) return routeTotal;
    return boulderTotal;
  }, [modeParam, hasBoulder, hasRoutes, boulderTotal, routeTotal]);

  const ring = (
    <DualActivityRing
      size={170}
      thickness={14}
      trainingPct={trainingPct}
      climbCount={activeTotal}
      parts={activeParts.length ? activeParts : []}
      climbGoal={10}
      outerColor="#A5D23D"
      innerColor="#3B82F6"
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
    <View style={styles.iconBtn}>
      <TouchableOpacity activeOpacity={0.85} onPress={handleBack} style={styles.iconBtnInner}>
        <Ionicons name="arrow-back" size={25} color="#111" />
      </TouchableOpacity>
    </View>
  );

  const RightActions = (
    <TouchableOpacity onPress={handleMenu} style={styles.iconBtn}>
      <Ionicons name="ellipsis-horizontal" size={22} color="#111" />
    </TouchableOpacity>
  );

  return (
    <CollapsibleLargeHeaderFlatList
      backgroundColor="#F9FAFB"
      smallTitle="Route Log"
      largeTitle={<Text style={styles.largeTitle}>Route Log</Text>}
      subtitle={
        <View>
          <Text style={styles.largeSubtitle}>{displayDate}</Text>
          {gymName ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Ionicons name="location-outline" size={12} color="#9CA3AF" />
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{gymName}</Text>
            </View>
          ) : null}
        </View>
      }
      leftActions={LeftActions}
      rightActions={RightActions}
      data={dailyLogs}
      keyExtractor={(item: any, index: number) => item.id || index.toString()}
      renderItem={renderClimbCard as any}
      listHeader={listHeader}
      contentContainerStyle={{ paddingBottom: 8 }}
      bottomInsetExtra={28}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  iconBtnInner: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  // KPI row
  kpiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
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
  kpiValue: { fontSize: 18, fontWeight: "800", color: "#111" },
  kpiLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginTop: 2 },
  kpiDivider: { width: 1, height: 28, backgroundColor: "#F3F4F6" },

});
