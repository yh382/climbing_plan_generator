// src/features/activity/useQuickInsights.ts
//
// TR7 Phase 2/3 — builds the InsightCard arrays for Sessions / Training
// segments. Kept as a hook (not a service) so we can `useMemo` against
// reactive store state without making the segment components heavier.
//
// Card MVP:
//   Sessions ribbon:
//     1. CSM quadrant      (shared CSM analyzer)
//     2. Top grade         (kpis.maxBoulder / maxRope)
//     3. Climb volume      (last 30d total sends or duration)
//   Training ribbon:
//     1. CSM quadrant      (same card — climb-driven strategy compass)
//     2. Goal category     (placeholder until TR7-FU lands the BE service)
//     3. Train volume      (placeholder until TR7-FU)

import { useMemo } from "react";

import useLogsStore from "@/store/useLogsStore";
import { calculateKPIs } from "@/services/stats";

import type { InsightCard } from "./QuickInsightsRibbon";

export type RibbonSegment = "sessions" | "training";

/** Friendly Chinese / English labels for the 4 CSM quadrants. Mirrors
 *  the strings already used inside CSMSummary so the ribbon and the
 *  detail card stay in sync. */
function quadrantLabel(q: string | undefined, isZH: boolean): { label: string; accent: string } {
  switch (q) {
    case "push":      return { label: isZH ? "推极限" : "Push",      accent: "#306E6F" };
    case "challenge": return { label: isZH ? "迎挑战" : "Challenge", accent: "#A08060" };
    case "develop":   return { label: isZH ? "积累期" : "Develop",   accent: "#5C6BC0" };
    case "rebuild":   return { label: isZH ? "恢复期" : "Rebuild",   accent: "#9CA3AF" };
    default:          return { label: isZH ? "数据中" : "Pending",   accent: "#9CA3AF" };
  }
}

interface Options {
  isZH: boolean;
  segment: RibbonSegment;
  /** When known, the dominant quadrant from the CSM fetched in
   *  AnalysisScreen / CSMDailyCard. We don't refetch here. */
  quadrant?: string | null;
}

export function useQuickInsights({ isZH, segment, quadrant }: Options): InsightCard[] {
  const sessions = useLogsStore((s) => s.sessions);
  const logs = useLogsStore((s) => s.logs);

  const kpis = useMemo(() => calculateKPIs(logs, sessions), [logs, sessions]);

  return useMemo(() => {
    const t = (zh: string, en: string) => (isZH ? zh : en);

    const csmInfo = quadrantLabel(quadrant ?? undefined, isZH);
    const csmCard: InsightCard = {
      key: "csm",
      focus: "csm",
      label: t("攀爬状态", "Climb State"),
      value: csmInfo.label,
      accent: csmInfo.accent,
      icon: "compass-outline",
      sub: t("点击查看详情", "Tap for details"),
    };

    if (segment === "sessions") {
      const topBoulder = kpis.maxBoulder || "—";
      const topRope = kpis.maxRope || "—";
      const topGradeCard: InsightCard = {
        key: "top-grade",
        focus: "pyramid",
        label: t("最高难度", "Top Grade"),
        value: topBoulder,
        sub: topRope === "—" ? t("抱石", "Boulder") : `${t("抱石", "Boulder")} · ${topRope} ${t("绳攀", "Rope")}`,
        icon: "trending-up-outline",
      };

      // Climb volume — last 30-day session count + total sends. Cheap to
      // compute on the fly so we don't drag a stats endpoint into the
      // ribbon path.
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let recentSessions = 0;
      let recentSends = 0;
      for (const s of sessions) {
        if (new Date(s.date).getTime() >= cutoff) {
          recentSessions += 1;
          recentSends += s.sends ?? 0;
        }
      }
      const volumeCard: InsightCard = {
        key: "climb-volume",
        focus: "volume",
        label: t("近 30 天", "Last 30d"),
        value: `${recentSessions}`,
        sub: `${recentSessions} ${t("次 ·", "sessions ·")} ${recentSends} ${t("送达", "sends")}`,
        icon: "stats-chart-outline",
      };

      return [csmCard, topGradeCard, volumeCard];
    }

    // Training segment. TR7-FU will fill the goal-category + train-volume
    // cards with real numbers from BE training_analyzer; for now we ship
    // placeholders that still navigate to the right (future) anchor so
    // the UX shape is correct.
    const goalCategoryCard: InsightCard = {
      key: "goal-category",
      focus: "training-goal-cat",
      label: t("训练分布", "Goal Mix"),
      value: t("解锁中", "Pending"),
      sub: t("完成首个训练解锁", "Train once to unlock"),
      icon: "pie-chart-outline",
    };
    const trainVolumeCard: InsightCard = {
      key: "train-volume",
      focus: "training-volume",
      label: t("本月训练", "This Month"),
      value: t("解锁中", "Pending"),
      sub: t("完成首个训练解锁", "Train once to unlock"),
      icon: "barbell-outline",
    };
    return [csmCard, goalCategoryCard, trainVolumeCard];
  }, [isZH, segment, quadrant, kpis, sessions]);
}
