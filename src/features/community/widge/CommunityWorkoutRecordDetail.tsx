// src/features/community/widge/CommunityWorkoutRecordDetail.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";

import CollapsibleLargeHeaderFlatList from "../../../components/CollapsibleLargeHeaderFlatList";
import DualActivityRing from "../../journal/DualActivityRing";
import { colorForBoulder, colorForYDS } from "../../../../lib/gradeColors";

type LogType = "boulder" | "toprope" | "lead";

function inferSendCount(item: any): number {
  if (typeof item?.sendCount === "number") return item.sendCount;
  const style = item?.style;
  if (style === "redpoint" || style === "flash" || style === "onsight") return 1;
  if (item?.isSent === true) return 1;
  if (item?.status === "sent" || item?.status === "send") return 1;
  return 0;
}

function toParts(items: any[], type: LogType) {
  const map = new Map<string, number>();
  for (const it of items || []) {
    const g = String(it?.grade || "—").trim() || "—";
    map.set(g, (map.get(g) || 0) + 1);
  }
  return Array.from(map.entries()).map(([grade, count]) => ({
    grade,
    count,
    color: type === "boulder" ? colorForBoulder(grade) : colorForYDS(grade),
  }));
}

export default function CommunityWorkoutRecordDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    // CommunityScreen 里会把 attachment 打包成 JSON 丢进来
    attachment?: string; // JSON string
    // 也允许直接传这几个字段（可选）
    date?: string;
    gymName?: string;
  }>();

  const attachment = useMemo(() => {
    if (!params.attachment) return null;
    try {
      return JSON.parse(String(params.attachment));
    } catch {
      return null;
    }
  }, [params.attachment]);

  // 兼容两种结构：
  // A) attachment.payload = { boulder: [], yds: [] }
  // B) attachment.payload = { itemsB: [], itemsR: [] }
  // C) attachment.payload = [] (混合数组，按 grade 前缀分桶)
  const date = String(params.date || attachment?.date || attachment?.payload?.date || "");
  const gymName = String(params.gymName || attachment?.gymName || attachment?.payload?.gymName || "");

  const { itemsB, itemsR } = useMemo(() => {
    const p = attachment?.payload;
    const b = p?.boulder ?? p?.itemsB ?? [];
    const r = p?.yds ?? p?.itemsR ?? [];

    if (Array.isArray(b) || Array.isArray(r)) {
      return {
        itemsB: Array.isArray(b) ? b : [],
        itemsR: Array.isArray(r) ? r : [],
      };
    }

    if (Array.isArray(p)) {
      const bb: any[] = [];
      const rr: any[] = [];
      for (const it of p) {
        const g = String(it?.grade || "");
        if (/^V\d+/i.test(g)) bb.push(it);
        else rr.push(it);
      }
      return { itemsB: bb, itemsR: rr };
    }

    return { itemsB: [], itemsR: [] };
  }, [attachment]);

  const list = useMemo(() => [...itemsB, ...itemsR], [itemsB, itemsR]);

  const displayDate = useMemo(() => {
    if (!date) return "Daily Log";
    try {
      return format(parseISO(date), "EEEE, MMM dd");
    } catch {
      return date;
    }
  }, [date]);

  const sends = useMemo(() => list.reduce((s, it) => s + inferSendCount(it), 0), [list]);

  const bParts = useMemo(() => toParts(itemsB, "boulder"), [itemsB]);
  const rParts = useMemo(() => toParts(itemsR, "lead"), [itemsR]);

  const renderItem = ({ item }: { item: any }) => {
    const status = item.status || (item.attempts === 1 ? "flash" : "sent");
    const statusColor = status === "flash" ? "#F59E0B" : status === "sent" ? "#10B981" : "#EF4444";
    const statusText = status === "flash" ? "⚡ Flash" : status === "sent" ? "✅ Sent" : "❌ Attempt";

    const routeName = (item?.name || item?.routeName || item?.route || "").trim();
    const note = String(item?.note || item?.notes || "").trim();

    const imageUri = item?.image || item?.media?.[0]?.uri || item?.media?.[0]?.url || "";

    return (
      <View style={{ paddingHorizontal: 16 }}>
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

            {routeName ? (
              <Text style={styles.routeName} numberOfLines={1}>
                {routeName}
              </Text>
            ) : null}

            <View style={styles.rowBottom}>
              <Ionicons name="refresh" size={14} color="#6B7280" />
              <Text style={styles.attemptsText}>{item?.attemptsTotal || item?.attempts || 1} attempts</Text>
            </View>

            {note ? (
              <View style={styles.noteBubble}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#64748B" />
                <Text style={styles.noteText} numberOfLines={2}>
                  {note}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const header = (
    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
      {/* 这里默认展示 “boulder ring”，如果你想按 attachment.mode 切换也可以 */}
      <DualActivityRing
        size={170}
        thickness={14}
        trainingPct={0}
        climbCount={itemsB.length}
        parts={bParts}
        climbGoal={10}
        outerColor="#A5D23D"
        innerColor="#3B82F6"
      />

      <View style={{ height: 10 }} />
      <Text style={{ fontSize: 14, color: "#6B7280" }}>{displayDate}</Text>
      {gymName ? <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{gymName}</Text> : null}
      <Text style={{ fontSize: 12, color: "#111", marginTop: 6, fontWeight: "800" }}>{sends} sends</Text>
      <View style={{ height: 12 }} />
    </View>
  );

  const LeftActions = (
    <View style={styles.iconBtn}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.back()} style={styles.iconBtnInner}>
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
      rightActions={null as any} // ✅ community 只读：不显示 3dots / edit
      data={list}
      keyExtractor={(item: any, index: number) => item.id || String(index)}
      renderItem={renderItem as any}
      listHeader={header}
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
