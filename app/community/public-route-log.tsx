// app/community/public-route-log.tsx
import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { format, parseISO } from "date-fns";

import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";
import { api } from "../../src/lib/apiClient";
import DualActivityRing from "../../src/features/journal/DualActivityRing";
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";

type LogItem = {
  id: string;
  grade_text: string;
  route_name?: string | null;
  result: string;
  feel?: string | null;
  wall_type: string;
  attempts: number;
  note?: string | null;
};

type PublicSessionData = {
  id: string;
  userId: string;
  username: string | null;
  avatar: string | null;
  date: string;
  gymName: string | null;
  durationMinutes: number | null;
  totalSends: number;
  bestGrade: string | null;
  logs: LogItem[];
  summary: any;
  visibility: string;
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  largeSubtitle: { fontSize: 14, fontFamily: theme.fonts.regular, color: colors.textSecondary, marginTop: 2 },

  gradeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  gradeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  gradeText: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  gradeCount: {
    marginLeft: "auto",
    fontSize: 14,
    fontFamily: theme.fonts.monoRegular,
    color: colors.textSecondary,
  },

  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  gradeBadge: {
    width: 48,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeBadgeText: {
    color: "#FFF",
    fontFamily: theme.fonts.bold,
    fontSize: 13,
  },
  logName: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  logMeta: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default function PublicRouteLogScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [session, setSession] = useState<PublicSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    api.get<PublicSessionData>(`/sessions/public/${sessionId}`)
      .then(setSession)
      .catch(() => Alert.alert("Error", "Session not found"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const displayDate = useMemo(() => {
    if (!session?.date) return "Route Log";
    try {
      return format(parseISO(session.date), "EEEE, MMM dd");
    } catch {
      return session.date;
    }
  }, [session?.date]);

  // Separate boulder vs rope logs
  const { boulderLogs, ropeLogs } = useMemo(() => {
    if (!session?.logs) return { boulderLogs: [] as LogItem[], ropeLogs: [] as LogItem[] };
    const b: LogItem[] = [];
    const r: LogItem[] = [];
    for (const log of session.logs) {
      if (log.wall_type === "boulder") b.push(log);
      else r.push(log);
    }
    return { boulderLogs: b, ropeLogs: r };
  }, [session?.logs]);

  // Grade distribution for ring
  const gradeParts = useMemo(() => {
    const allLogs = session?.logs ?? [];
    const map = new Map<string, number>();
    for (const log of allLogs) {
      const g = log.grade_text || "—";
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries()).map(([grade, count]) => {
      const isBoulder = /^V\d+/i.test(grade) || /^[3-8][ABC]?\+?$/i.test(grade);
      return {
        grade,
        count,
        color: isBoulder ? colorForBoulder(grade) : colorForYDS(grade),
      };
    });
  }, [session?.logs]);

  // Grade summary (aggregated)
  const gradeSummary = useMemo(() => {
    return [...gradeParts].sort((a, b) => b.count - a.count);
  }, [gradeParts]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.cardDark} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>Session not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.cardDark, fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const resultLabel = (r: string) => {
    switch (r) {
      case "flash": return "Flash";
      case "onsight": return "Onsight";
      case "send": return "Send";
      case "attempt": return "Attempt";
      default: return r;
    }
  };

  const resultColor = (r: string) => {
    switch (r) {
      case "flash": return "#F59E0B";
      case "onsight": return "#8B5CF6";
      case "send": return "#10B981";
      default: return "#9CA3AF";
    }
  };

  const renderItem = ({ item }: { item: LogItem }) => {
    const isBoulder = item.wall_type === "boulder";
    const gradeColor = isBoulder ? colorForBoulder(item.grade_text) : colorForYDS(item.grade_text);

    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.logRow}>
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor }]}>
            <Text style={styles.gradeBadgeText}>{item.grade_text}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.logName} numberOfLines={1}>
              {item.route_name || item.grade_text}
            </Text>
            <Text style={styles.logMeta}>
              <Text style={{ color: resultColor(item.result) }}>{resultLabel(item.result)}</Text>
              {item.feel ? ` · ${item.feel}` : ""}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const header = (
    <View style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}>
      <DualActivityRing
        size={200}
        thickness={16}
        trainingPct={0}
        climbCount={session.totalSends}
        parts={gradeParts}
        climbGoal={10}
        outerColor="#A08060"
        innerColor="#306E6F"
      />

      <View style={{ height: 10 }} />
      <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: colors.textSecondary }}>{displayDate}</Text>
      {session.gymName ? (
        <Text style={{ fontSize: 12, fontFamily: theme.fonts.regular, color: colors.textTertiary, marginTop: 2 }}>
          {session.gymName}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: colors.textPrimary, marginTop: 6 }}>
        {session.totalSends} sends
      </Text>

      {/* Grade summary */}
      <View style={{ width: "100%", paddingHorizontal: 20, marginTop: 16, marginBottom: 8 }}>
        {gradeSummary.map(({ grade, count, color }) => (
          <View key={grade} style={styles.gradeRow}>
            <View style={[styles.gradeDot, { backgroundColor: color }]} />
            <Text style={styles.gradeText}>{grade}</Text>
            <Text style={styles.gradeCount}>{count}</Text>
          </View>
        ))}
      </View>

      <View style={{ paddingHorizontal: 20, width: "100%", marginTop: 8, marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontFamily: theme.fonts.bold, color: colors.textPrimary }}>
          Routes
        </Text>
      </View>
    </View>
  );

  const subtitleText = session.username ? `@${session.username}` : displayDate;

  return (
    <>
      <Stack.Screen options={{
        ...NATIVE_HEADER_LARGE,
        title: "Route Log",
      }} />
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={session.logs}
        keyExtractor={(item: any, index: number) => item.id || String(index)}
        renderItem={renderItem as any}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>
              <Text style={styles.largeSubtitle}>{subtitleText}</Text>
            </View>
            {header}
          </>
        }
        contentContainerStyle={{ paddingBottom: 8 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
