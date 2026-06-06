// src/features/analysis/AnalysisScreen.tsx
// Reusable analysis content. Mounted from app/analysis.tsx (root route with back)
// and from Activity tab's Analysis segment. This component does NOT configure
// the navigation header — the caller (route or segment) owns that.

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BoulderIcon from "../../components/ui/icons/BoulderIcon";
import TopRopeIcon from "../../components/ui/icons/TopRopeIcon";

// Analysis components
import TrainingVolumeChart from "./TrainingVolumeChart";
import GradePyramid from "./GradePyramid";
import CSMSummary from "./CSMSummary";
import ClimbStateMap from "./ClimbStateMap";
import EdgeZoneCard from "./EdgeZoneCard";
import ActionAdvice from "./ActionAdvice";
import { theme } from "../../lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";

// Stores & Services
import useLogsStore from "../../store/useLogsStore";
import { calculateKPIs } from "../../services/stats";
import { fetchCSMState } from "../../services/stats/apiStats";
import type { CSMState, CSMHistoryPoint } from "../../services/stats/csmAnalyzer";

type CSMDiscipline = "boulder" | "rope";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_CARD_HEIGHT = 440;

/** TR7 — focus key map. Ribbon cards push `/analysis?focus=<key>` and
 *  this screen scrolls to the matching anchor on mount. Keys cover the
 *  3 climb-side sections + 5 training-side sub-components (training-*
 *  variants resolve to the same anchor for now; TR7-FU adds per-subsection
 *  scroll targets when TrainingInsightsSection lands). */
export type AnalysisFocusKey =
  | "csm"
  | "pyramid"
  | "volume"
  | "training-insights"
  | "training-goal-cat"
  | "training-volume"
  | "training-adherence"
  | "training-body-area"
  | "training-variant";

type Props = {
  /** When true, renders without a wrapping ScrollView so the parent can scroll. */
  embedded?: boolean;
  /** TR7 — scroll target. Causes `scrollViewRef.current.scrollTo` post-mount. */
  focus?: AnalysisFocusKey;
};

export default function AnalysisScreen({ embedded = false, focus }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { logs, sessions: logSessions } = useLogsStore();
  const kpis = useMemo(() => calculateKPIs(logs, logSessions), [logs, logSessions]);

  const [chartPage, setChartPage] = useState(0);
  const chartScrollRef = useRef<ScrollView>(null);

  // TR7 — scroll anchor refs keyed by AnalysisFocusKey. We measure
  // y-offset onLayout and replay it via scrollViewRef in a post-mount
  // effect.
  const outerScrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Partial<Record<AnalysisFocusKey, number>>>({});

  // Single onLayout handler factory keeps the per-section setup tidy.
  const sectionOnLayout = (key: AnalysisFocusKey) => (e: any) => {
    sectionOffsetsRef.current[key] = e.nativeEvent.layout.y;
  };

  useEffect(() => {
    if (!focus || embedded) return;
    // Allow layouts to settle; a single rAF + 80ms is usually enough on
    // device. Fallback no-op if the section never measured (silent so
    // ribbon taps still feel responsive).
    const handle = setTimeout(() => {
      const y = sectionOffsetsRef.current[focus];
      if (typeof y === "number") {
        outerScrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
    }, 120);
    return () => clearTimeout(handle);
  }, [focus, embedded]);

  const [csmDiscipline, setCsmDiscipline] = useState<CSMDiscipline>("boulder");
  const [csmBoulder, setCsmBoulder] = useState<CSMState | null>(null);
  const [csmRope, setCsmRope] = useState<CSMState | null>(null);
  const [historyBoulder, setHistoryBoulder] = useState<CSMHistoryPoint[]>([]);
  const [historyRope, setHistoryRope] = useState<CSMHistoryPoint[]>([]);
  const [csmLoading, setCsmLoading] = useState(true);
  const [csmError, setCsmError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCsmLoading(true);
    setCsmError(false);
    fetchCSMState()
      .then((res) => {
        if (cancelled) return;
        setCsmBoulder(res.boulder);
        setCsmRope(res.rope);
        setHistoryBoulder(res.historyBoulder);
        setHistoryRope(res.historyRope);
      })
      .catch(() => {
        if (!cancelled) setCsmError(true);
      })
      .finally(() => {
        if (!cancelled) setCsmLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const currentCSM = csmDiscipline === "boulder" ? csmBoulder : csmRope;
  const currentHistory = csmDiscipline === "boulder" ? historyBoulder : historyRope;

  const chartCards = [
    { key: "volume", render: (active: boolean) => <TrainingVolumeChart isActive={active} /> },
    { key: "pyramid", render: (active: boolean) => <GradePyramid isActive={active} /> },
  ];

  const content = (
    <>
      {/* KPI: Boulder | Rope */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiCardTitleRow}>
            <BoulderIcon size={40} color={colors.textSecondary} />
            <Text style={styles.kpiCardTitle}>{tr("抱石", "Boulder")}</Text>
          </View>
          <View style={styles.kpiPair}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiVal}>{kpis.maxBoulder}</Text>
              <Text style={styles.kpiLabel}>{tr("最高难度", "max grade")}</Text>
            </View>
            <View style={styles.kpiItemDivider} />
            <View style={styles.kpiItem}>
              <Text style={styles.kpiVal}>{kpis.totalBoulder}</Text>
              <Text style={styles.kpiLabel}>{tr("完攀", "sends")}</Text>
            </View>
          </View>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiCardTitleRow}>
            <TopRopeIcon size={40} color={colors.textSecondary} />
            <Text style={styles.kpiCardTitle}>{tr("绳攀", "Rope")}</Text>
          </View>
          <View style={styles.kpiPair}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiVal}>{kpis.maxRope}</Text>
              <Text style={styles.kpiLabel}>{tr("最高难度", "max grade")}</Text>
            </View>
            <View style={styles.kpiItemDivider} />
            <View style={styles.kpiItem}>
              <Text style={styles.kpiVal}>{kpis.totalRope}</Text>
              <Text style={styles.kpiLabel}>{tr("完攀", "sends")}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Charts carousel — both pyramid + volume live here; we register the
          same onLayout for both keys since the carousel is a single
          horizontal scroller. */}
      <View
        style={styles.dotRow}
        onLayout={(e) => {
          sectionOnLayout("pyramid")(e);
          sectionOnLayout("volume")(e);
        }}
      >
        {chartCards.map((_, i) => (
          <View key={i} style={[styles.dot, chartPage === i && styles.dotActive]} />
        ))}
      </View>

      <View style={{ marginHorizontal: -16 }}>
        <ScrollView
          ref={chartScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setChartPage(page);
          }}
        >
          {chartCards.map((card, i) => (
            <View
              key={card.key}
              style={{ width: SCREEN_WIDTH, paddingHorizontal: 16, height: CHART_CARD_HEIGHT }}
            >
              {card.render(chartPage === i)}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* CSM section */}
      <View style={styles.csmSectionHeader} onLayout={sectionOnLayout("csm")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.csmSectionTitle}>{tr("攀爬状态模型", "Climb State Model")}</Text>
          <TouchableOpacity onPress={() => router.push("/csm-help")} hitSlop={8}>
            <Ionicons name="help-circle-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, csmDiscipline === "boulder" && styles.toggleBtnActive]}
            onPress={() => setCsmDiscipline("boulder")}
          >
            <Text style={[styles.toggleText, csmDiscipline === "boulder" && styles.toggleTextActive]}>{tr("抱石", "Boulder")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, csmDiscipline === "rope" && styles.toggleBtnActive]}
            onPress={() => setCsmDiscipline("rope")}
          >
            <Text style={[styles.toggleText, csmDiscipline === "rope" && styles.toggleTextActive]}>{tr("绳攀", "Rope")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.csmSourceNote}>
        {tr(
          `基于最近 6 周的${csmDiscipline === "boulder" ? "抱石" : "绳攀"}数据`,
          `Based on your last 6 weeks of ${csmDiscipline === "boulder" ? "bouldering" : "rope climbing"} data`
        )}
      </Text>

      {csmLoading ? (
        <View style={styles.csmPlaceholder}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.csmPlaceholderText}>{tr("正在加载分析...", "Loading analysis...")}</Text>
        </View>
      ) : csmError ? (
        <View style={styles.csmPlaceholder}>
          <Text style={styles.csmPlaceholderText}>{tr("无法加载 CSM 数据，请检查网络连接。", "Could not load CSM data. Check your connection.")}</Text>
        </View>
      ) : !currentCSM ? (
        <View style={styles.csmPlaceholder}>
          <Text style={styles.csmPlaceholderText}>
            {tr(
              `${csmDiscipline === "boulder" ? "抱石" : "绳攀"}数据不足。\n最近 6 周至少记录 3 次攀爬才能解锁 CSM 分析。`,
              `Not enough ${csmDiscipline} data yet.\nLog at least 3 climbs in the last 6 weeks to unlock CSM analysis.`
            )}
          </Text>
        </View>
      ) : (
        <>
          <CSMSummary state={currentCSM} />
          <ClimbStateMap current={currentCSM} history={currentHistory} />
          <EdgeZoneCard edgeZone={currentCSM.edgeZone} discipline={currentCSM.discipline} pi={currentCSM.pi} />
          <ActionAdvice state={currentCSM} history={currentHistory} />
        </>
      )}
    </>
  );

  if (embedded) {
    return <View style={{ paddingHorizontal: 16 }}>{content}</View>;
  }

  return (
    <ScrollView
      ref={outerScrollRef}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
    >
      {content}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 0,
  },
  kpiCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  kpiCardTitle: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: colors.textSecondary,
  },
  kpiPair: {
    flexDirection: "row",
    alignItems: "center",
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
  },
  kpiItemDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  kpiVal: {
    fontSize: 18,
    fontFamily: "DMMono_500Medium",
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontFamily: "DMSans_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  csmSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  csmSectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_900Black",
    color: colors.textPrimary,
  },
  csmSourceNote: {
    fontSize: 11,
    color: colors.textTertiary,
    fontFamily: "DMSans_400Regular",
    marginBottom: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.background,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: "DMSans_500Medium",
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textPrimary,
  },
  csmPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    borderWidth: 0,
    alignItems: "center",
    gap: 10,
  },
  csmPlaceholderText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: theme.fonts.regular,
  },
});
