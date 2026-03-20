import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useProfileStore } from "@/features/profile/store/useProfileStore";
import useLogsStore from "../../../store/useLogsStore";
import { calculateMonthlyKPIs } from "../../../services/stats";

import AbilityRadar from "./basicinfo/cards/AbilityRadar";
import AnthropometricCard from "./basicinfo/cards/AnthropometricCard";
import CapacityCard from "./basicinfo/cards/CapacityCard";
import FingerStrengthCard from "./basicinfo/cards/FingerStrengthCard";
import MobilityCard from "./basicinfo/cards/MobilityCard";
import CoreEnduranceCard from "./basicinfo/cards/CoreEnduranceCard";
import { RecentClimbsList } from "./RecentClimbsList";

import type { HeaderViewModel } from "./basicinfo/types";

type Props = {
  user: HeaderViewModel;
  styles: any;
};

export default function StatsSection({ user, styles: parentStyles }: Props) {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const { logs, sessions } = useLogsStore();
  const [bodyExpanded, setBodyExpanded] = useState(false);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const monthKpis = useMemo(
    () => calculateMonthlyKPIs(logs, sessions, viewYear, viewMonth),
    [logs, sessions, viewYear, viewMonth]
  );

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  }, [viewYear, viewMonth]);

  const radarData = user.abilityRadar ?? {
    finger: 10,
    pull: 10,
    core: 10,
    flex: 10,
    sta: 10,
  };

  const bodyHeight = useSharedValue(0);
  const bodyOpacity = useSharedValue(0);

  const toggleBody = () => {
    const next = !bodyExpanded;
    setBodyExpanded(next);
    bodyHeight.value = withTiming(next ? 1 : 0, { duration: 300 });
    bodyOpacity.value = withTiming(next ? 1 : 0, { duration: 250 });
  };

  const bodyAnimStyle = useAnimatedStyle(() => ({
    maxHeight: bodyHeight.value * 2000,
    opacity: bodyOpacity.value,
    overflow: "hidden" as const,
  }));

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <View style={s.container}>
      {/* Section header with small "View Analysis" button */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Stats</Text>
        <TouchableOpacity onPress={() => router.push("/analysis")} activeOpacity={0.7}>
          <Text style={s.viewAnalysisBtn}>View Analysis →</Text>
        </TouchableOpacity>
      </View>

      {/* 1) Monthly Overview (moved above Radar) */}
      <View style={s.card}>
        <View style={s.monthHeader}>
          <TouchableOpacity onPress={goToPrevMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#6B7280" />
          </TouchableOpacity>
          <Text style={s.monthTitle}>{monthLabel}</Text>
          <TouchableOpacity onPress={goToNextMonth} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={s.kpiRow}>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{monthKpis.totalSends}</Text>
            <Text style={s.kpiLabel}>sends</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{monthKpis.maxBoulder}</Text>
            <Text style={s.kpiLabel}>max B</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{monthKpis.maxRope}</Text>
            <Text style={s.kpiLabel}>max R</Text>
          </View>
          <View style={s.kpiItem}>
            <Text style={s.kpiVal}>{monthKpis.activeDays}</Text>
            <Text style={s.kpiLabel}>days</Text>
          </View>
        </View>
      </View>

      {/* 2) Body Info (collapsible, includes radar + body cards) */}
      <Pressable onPress={toggleBody} style={s.collapseHeader}>
        <Text style={s.collapseTitle}>Body Info</Text>
        <Ionicons
          name={bodyExpanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#6B7280"
        />
      </Pressable>

      <Animated.View style={bodyAnimStyle}>
        <AbilityRadar data={radarData} styles={parentStyles} />
        <View style={parentStyles.basicInfoContainer}>
          <AnthropometricCard styles={parentStyles} profile={profile} user={user} />
          <CapacityCard styles={parentStyles} profile={profile} user={user} />
          <FingerStrengthCard styles={parentStyles} profile={profile} user={user} />
          <MobilityCard styles={parentStyles} profile={profile} user={user} />
          <CoreEnduranceCard styles={parentStyles} profile={profile} user={user} />
        </View>
      </Animated.View>

      {/* 3) Recent Climbs */}
      <Text style={s.recentTitle}>Recent Climbs</Text>
      <RecentClimbsList />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  viewAnalysisBtn: {
    fontSize: 13,
    color: "#2BB673",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  kpiItem: {
    alignItems: "center",
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  kpiLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  collapseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
});
