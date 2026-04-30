// src/features/dailysummary/CSMDailyCard.tsx
// Compact CSM-state card for the daily summary dashboard. Shows the user's
// current training state (quadrant) plus a one-line advice. Full CSM analysis
// stays in the Analysis segment.

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { theme, CSM_STATE_COLORS } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import useSettingsStore from "../../store/useSettingsStore";
import { fetchCSMState } from "../../services/stats/apiStats";
import type { CSMState } from "../../services/stats/csmAnalyzer";

const QUADRANT_LABEL: Record<
  string,
  { zh: string; en: string; advice_zh: string; advice_en: string }
> = {
  push: {
    zh: "Push · 稳步突破",
    en: "Push · Pushing steady",
    advice_zh: "状态在线——试试更高一级的路线。",
    advice_en: "You're dialed in — try a grade harder today.",
  },
  challenge: {
    zh: "Challenge · 挑战过度",
    en: "Challenge · Over-reaching",
    advice_zh: "在极限挣扎——先拆解动作再上。",
    advice_en: "Struggling at the edge — break down the moves first.",
  },
  develop: {
    zh: "Develop · 蓄势待发",
    en: "Develop · Ready to push",
    advice_zh: "基础稳——加点极限尝试找刺激。",
    advice_en: "Solid base — add a few limit attempts.",
  },
  rebuild: {
    zh: "Rebuild · 基础巩固",
    en: "Rebuild · Base-building",
    advice_zh: "专注舒适区巩固节奏和自信。",
    advice_en: "Consolidate the comfort zone and rebuild confidence.",
  },
};

export default function CSMDailyCard() {
  const router = useRouter();
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const setSegment = useSettingsStore((s) => s.setActivitySegment);

  const [boulder, setBoulder] = useState<CSMState | null>(null);
  const [rope, setRope] = useState<CSMState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCSMState()
      .then((res) => {
        if (cancelled) return;
        setBoulder(res.boulder);
        setRope(res.rope);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const current = boulder ?? rope;

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (error || !current) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>{tr("攀爬状态", "Training State")}</Text>
        <Text style={styles.emptyText}>
          {tr("数据不足 — 多记录几次以解锁分析。", "Not enough data — log more climbs to unlock.")}
        </Text>
      </View>
    );
  }

  const q = QUADRANT_LABEL[current.quadrant] ?? QUADRANT_LABEL.rebuild;
  const color = CSM_STATE_COLORS[current.quadrant as keyof typeof CSM_STATE_COLORS] ?? colors.accent;
  const label = lang === "en" ? q.en : q.zh;
  const advice = lang === "en" ? q.advice_en : q.advice_zh;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => {
        setSegment("analysis");
        router.push("/(drawer)/(tabs)/activity" as any);
      }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr("攀爬状态", "Training State")}</Text>
        <View style={[styles.badge, { backgroundColor: color + "18" }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
      </View>
      <Text style={styles.advice}>{advice}</Text>
      <Text style={styles.cta}>{tr("查看完整分析 →", "View full analysis →")}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 14,
      padding: 16,
      marginHorizontal: 4,
      minHeight: 140,
      justifyContent: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    title: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      letterSpacing: 0.3,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: {
      fontSize: 12,
      fontFamily: theme.fonts.bold,
    },
    advice: {
      fontSize: 14,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    cta: {
      marginTop: 10,
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.accent,
    },
    emptyTitle: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      lineHeight: 18,
    },
  });
