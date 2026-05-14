// src/features/profile/components/fivecorefunction/StatsAndBadgesSection.tsx
// Window β — Profile KAYA: 4-card stack for the "Stats & Badges" segment.
//
//   1. Stats card    → Pressable, opens RecentClimbs sheet (medium)
//   2. Ability Radar → Pressable, opens BasicInfo sheet (large)
//   3. Badges        → BadgesSection wrapper (existing data source)
//   4. Lists         → ListsSection wrapper (own lists; ListsSection accepts userId
//                      so other-user view can reuse it elsewhere)
//
// Self-only: data sources for stats / badges / body info read the current
// user's stores; other-user view uses PublicStatsSection + inline badges
// in community/u/[id].tsx, which is unchanged in this window.

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";

import useLogsStore from "@/store/useLogsStore";
import { calculateMonthlyKPIs } from "@/services/stats";

import AbilityRadar from "../basicinfo/cards/AbilityRadar";
import BadgesSection from "./BadgesSection";
import VerticalGradePyramid from "./cards/VerticalGradePyramid";
import { NativeSegmentedControl } from "@/components/ui";

import type { HeaderViewModel } from "../basicinfo/types";
import type { LogType } from "@/services/stats/types";

interface Props {
  user: HeaderViewModel;
  /** Parent screen styles (passed through to BasicInfoSection / BadgesSection /
   *  AbilityRadar — they read class names like `analysisCard` / `radarCard`). */
  parentStyles: any;
}

export default function StatsAndBadgesSection({ user, parentStyles }: Props) {
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── Stats card: month nav + KPIs ──
  const { logs, sessions } = useLogsStore();
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const monthKpis = useMemo(
    () => calculateMonthlyKPIs(logs, sessions, viewYear, viewMonth),
    [logs, sessions, viewYear, viewMonth],
  );
  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    const locale = lang === "zh" ? "zh-CN" : "en-US";
    return d.toLocaleString(locale, { month: "long", year: "numeric" });
  }, [viewYear, viewMonth, lang]);

  const goToPrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const radarData = user.abilityRadar ?? {
    finger: 10,
    pull: 10,
    core: 10,
    flex: 10,
    sta: 10,
  };

  // Grade pyramid type toggle — independent of the Stats card month nav; the
  // pyramid covers all-time logs so the user sees their full climbing range.
  const [pyramidType, setPyramidType] = useState<LogType>("boulder");

  return (
    <View style={styles.container}>
      {/* 1) Stats card — tap whole card opens RecentClimbs sheet */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tr("统计", "Stats")}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/analysis")}
            activeOpacity={0.7}
            hitSlop={6}
          >
            <Text style={styles.moreLink}>
              {tr("查看分析 →", "View Analysis →")}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsCard}>
          {/* Month nav row stays outside the Pressable — chevrons are their own
              interactive elements; nesting Pressables makes RN propagation
              unreliable, so we keep them sibling-level. */}
          <View style={styles.monthRow}>
            <Pressable onPress={goToPrevMonth} hitSlop={10}>
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Pressable onPress={goToNextMonth} hitSlop={10}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          {/* KPI block is what the user reads; tapping it opens the sheet. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("查看本月攀登记录", "View this month's climbs")}
            onPress={() => router.push("/recent-climbs" as any)}
            style={({ pressed }) => [
              styles.kpiPressable,
              pressed ? styles.cardPressed : null,
            ]}
          >
            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiVal}>{monthKpis.totalSends}</Text>
                <Text style={styles.kpiLabel}>{tr("次数", "Sends")}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiVal}>{monthKpis.maxRope}</Text>
                <Text style={styles.kpiLabel}>{tr("Max R", "Max R")}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiVal}>{monthKpis.activeDays}</Text>
                <Text style={styles.kpiLabel}>{tr("天数", "Days")}</Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {/* 2) Grade pyramid — compact vertical bar card (all-time) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tr("难度分布", "Grade Pyramid")}
          </Text>
        </View>
        <View style={styles.statsCard}>
          <View style={styles.pyramidToggleRow}>
            <NativeSegmentedControl
              options={[tr("抱石", "Boulder"), tr("绳攀", "Rope")]}
              selectedIndex={pyramidType === "boulder" ? 0 : 1}
              onSelect={(i) => setPyramidType(i === 0 ? "boulder" : "lead")}
              style={{ height: 28 }}
            />
          </View>
          <VerticalGradePyramid logs={logs} type={pyramidType} />
        </View>
      </View>

      {/* 3) Ability Radar — tap opens BasicInfo sheet */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tr("能力雷达", "Ability")}
          </Text>
          <Text style={styles.moreLink}>
            {tr("详情 →", "Details →")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("查看身体信息", "View body info")}
          onPress={() => router.push("/body-info" as any)}
          style={({ pressed }) => [
            styles.radarCardWrapper,
            pressed ? styles.cardPressed : null,
          ]}
        >
          <AbilityRadar data={radarData} styles={parentStyles} />
        </Pressable>
      </View>

      {/* 4) Badges — full-bleed: BadgesSection has its own internal padding;
             negate the container's paddingHorizontal so we don't double it. */}
      <View style={[styles.section, styles.badgesBleed]}>
        <BadgesSection styles={parentStyles} />
      </View>

    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 16,
    },
    section: {
      gap: 8,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingHorizontal: 4,
      marginBottom: 2,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    moreLink: {
      fontSize: 12,
      fontWeight: "500",
      fontFamily: theme.fonts.medium,
      color: colors.accent,
    },
    statsCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
    },
    kpiPressable: {
      marginHorizontal: -4,
      marginVertical: -4,
      padding: 4,
      borderRadius: 12,
    },
    radarCardWrapper: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      paddingVertical: 0,
      paddingHorizontal: 0,
      alignItems: "center",
      overflow: "hidden",
    },
    badgesBleed: {
      // Container has paddingHorizontal:16; BadgesSection internally pads
      // its grid by 12 — without this negative margin, the row gets 28pt of
      // edge padding (visibly more inset than other cards on the screen).
      marginHorizontal: -16,
    },
    cardPressed: {
      opacity: 0.8,
    },
    monthRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    pyramidToggleRow: {
      marginBottom: 8,
    },
    monthLabel: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    kpiRow: {
      flexDirection: "row",
      gap: 8,
    },
    kpiItem: {
      flex: 1,
      alignItems: "center",
    },
    kpiVal: {
      fontSize: 19,
      fontWeight: "700",
      fontFamily: theme.fonts.monoMedium,
      color: colors.textPrimary,
    },
    kpiLabel: {
      fontSize: 10,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textTransform: "uppercase",
      marginTop: 2,
      letterSpacing: 0.4,
    },
  });
