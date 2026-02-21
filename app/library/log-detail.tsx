// app/library/log-detail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import CollapsibleLargeHeaderFlatList from "../../src/components/CollapsibleLargeHeaderFlatList";
import DualActivityRing from "../../src/features/journal/DualActivityRing";
import { usePlanStore } from "../../src/store/usePlanStore";
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";

import { readDayList, readSessionList, readNotesByRoutes } from "../../src/features/journal/loglist/storage";

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
  const [trainingPct, setTrainingPct] = useState(0);

  const [itemsB, setItemsB] = useState<any[]>([]);
  const [itemsR, setItemsR] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!date && !sessionKey) return;

      const useSession = !!sessionKey;

      const [b, r] = await Promise.all([
        useSession ? readSessionList(sessionKey, "boulder") : readDayList(date, "boulder"),
        useSession ? readSessionList(sessionKey, "yds") : readDayList(date, "yds"),
      ]);

      if (cancelled) return;

      const bb = Array.isArray(b) ? b : [];
      const rr = Array.isArray(r) ? r : [];

      setItemsB(bb);
      setItemsR(rr);

      const names = [...bb, ...rr]
        .map((x: any) => (x?.name || x?.routeName || x?.route || "").trim())
        .filter(Boolean);

      const notes = await readNotesByRoutes(names);
      if (!cancelled) setLocalNotes(notes);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [date, sessionKey]);

  const dailyLogs = useMemo(() => [...itemsB, ...itemsR], [itemsB, itemsR]);

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
    try {
      return format(parseISO(date), "EEEE, MMM dd");
    } catch {
      return date;
    }
  }, [date]);

  const gymName = useMemo(() => {
    if (gymNameParam) return gymNameParam;
    const first: any = dailyLogs[0];
    return first?.gymName || first?.gym || first?.location || "";
  }, [gymNameParam, dailyLogs]);

  const hasBoulder = useMemo(() => dailyLogs.some((l: any) => isBoulderGrade(l?.grade)), [dailyLogs]);
  const hasRoutes = useMemo(() => dailyLogs.some((l: any) => isRouteGrade(l?.grade)), [dailyLogs]);

  // ring parts（按 items 分布，不依赖 store）
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

  const handleBack = () => {
    if (origin === "end_log") {
      router.replace("/calendar");
      return;
    }
    router.back();
  };

  const renderClimbCard = ({ item }: { item: any }) => {
    const status = item.status || (item.attempts === 1 ? "flash" : "sent");
    const statusColor = status === "flash" ? "#F59E0B" : status === "sent" ? "#10B981" : "#EF4444";
    const statusText = status === "flash" ? "⚡ Flash" : status === "sent" ? "✅ Sent" : "❌ Attempt";

    const routeName = (item?.name || item?.routeName || item?.route || "").trim();
    const note = ((routeName && localNotes[routeName]) || item?.note || item?.notes || "").trim();

    const imageUri = item?.image || item?.media?.[0]?.uri || item?.media?.[0]?.url || "";

    return (
      <View style={{ paddingHorizontal: SIDE_PAD }}>
        <View style={styles.card}>
          <View style={styles.imageContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.noImage]}>
                <Text style={{ fontSize: 24, fontWeight: "900", color: "#E5E7EB" }}>{item.grade}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.rowTop}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.gradeBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.gradeText}>{item.grade}</Text>
                </View>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
              </View>
            </View>

            {routeName ? <Text style={styles.routeName} numberOfLines={1}>{routeName}</Text> : null}

            <View style={styles.rowBottom}>
              <Ionicons name="refresh" size={14} color="#6B7280" />
              <Text style={styles.attemptsText}>{item?.attemptsTotal || item?.attempts || 1} attempts</Text>
            </View>

            {note ? (
              <View style={styles.noteBubble}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#64748B" />
                <Text style={styles.noteText} numberOfLines={2}>{note}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const ring = useMemo(() => {
    const emptyParts: any[] = [];

    if (modeParam === "boulder") {
      return (
        <DualActivityRing
          size={170}
          thickness={14}
          trainingPct={trainingPct}
          climbCount={boulderTotal}
          parts={boulderParts.length ? boulderParts : emptyParts}
          climbGoal={10}
          outerColor="#A5D23D"
          innerColor="#3B82F6"
        />
      );
    }
    if (modeParam === "rope") {
      return (
        <DualActivityRing
          size={170}
          thickness={14}
          trainingPct={trainingPct}
          climbCount={routeTotal}
          parts={routeParts.length ? routeParts : emptyParts}
          climbGoal={10}
          outerColor="#A5D23D"
          innerColor="#3B82F6"
        />
      );
    }

    if (hasBoulder && !hasRoutes) {
      return (
        <DualActivityRing
          size={170}
          thickness={14}
          trainingPct={trainingPct}
          climbCount={boulderTotal}
          parts={boulderParts.length ? boulderParts : emptyParts}
          climbGoal={10}
          outerColor="#A5D23D"
          innerColor="#3B82F6"
        />
      );
    }
    if (hasRoutes && !hasBoulder) {
      return (
        <DualActivityRing
          size={170}
          thickness={14}
          trainingPct={trainingPct}
          climbCount={routeTotal}
          parts={routeParts.length ? routeParts : emptyParts}
          climbGoal={10}
          outerColor="#A5D23D"
          innerColor="#3B82F6"
        />
      );
    }

    // both or none -> just show boulder by default
    return (
      <DualActivityRing
        size={170}
        thickness={14}
        trainingPct={trainingPct}
        climbCount={boulderTotal}
        parts={boulderParts.length ? boulderParts : emptyParts}
        climbGoal={10}
        outerColor="#A5D23D"
        innerColor="#3B82F6"
      />
    );
  }, [modeParam, trainingPct, boulderTotal, routeTotal, boulderParts, routeParts, hasBoulder, hasRoutes]);

  const listHeader = (
    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
      {ring}
      <View style={{ height: 10 }} />
      <Text style={{ fontSize: 14, color: "#6B7280" }}>{displayDate}</Text>
      {gymName ? <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{gymName}</Text> : null}
      <Text style={{ fontSize: 12, color: "#111", marginTop: 6, fontWeight: "800" }}>{sessionSends} sends</Text>
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

  return (
    <CollapsibleLargeHeaderFlatList
      backgroundColor="#F9FAFB"
      smallTitle="Daily Log"
      largeTitle={<Text style={styles.largeTitle}>Daily Log</Text>}
      subtitle={<Text style={styles.largeSubtitle}>{displayDate}</Text>}
      leftActions={LeftActions}
      rightActions={null as any}
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

  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  imageContainer: { width: 100, height: 100 },
  image: { width: "100%", height: "100%" },
  noImage: { backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center" },
  infoContainer: { flex: 1, padding: 12, justifyContent: "space-between" },

  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, minWidth: 40, alignItems: "center" },
  gradeText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  statusText: { fontSize: 12, fontWeight: "600" },

  routeName: { marginTop: 6, fontSize: 13, fontWeight: "800", color: "#111" },

  rowBottom: { flexDirection: "row", alignItems: "center", gap: 4 },
  attemptsText: { fontSize: 13, color: "#6B7280" },

  noteBubble: {
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteText: { flex: 1, color: "#334155", fontSize: 13, fontWeight: "700" },
});
