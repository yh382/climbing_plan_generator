// app/(tabs)/analysis.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BoulderIcon from "../src/components/ui/icons/BoulderIcon";
import TopRopeIcon from "../src/components/ui/icons/TopRopeIcon";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "../src/components/ui/HeaderButton";
import { useRouter } from "expo-router";
import { NATIVE_HEADER_LARGE } from "../src/lib/nativeHeaderOptions";
import { TrueSheet } from "@lodev09/react-native-true-sheet";

// Components
import TrainingVolumeChart from "../src/features/analysis/TrainingVolumeChart";
import GradePyramid from "../src/features/analysis/GradePyramid";
import CSMSummary from "../src/features/analysis/CSMSummary";
import ClimbStateMap from "../src/features/analysis/ClimbStateMap";
import EdgeZoneCard from "../src/features/analysis/EdgeZoneCard";
import ActionAdvice from "../src/features/analysis/ActionAdvice";
import { CSM_STATE_COLORS, theme } from "../src/lib/theme";
import { useThemeColors } from "../src/lib/useThemeColors";
import { useSettings } from "../src/contexts/SettingsContext";

// Stores & Services
import useLogsStore from "../src/store/useLogsStore";
import { calculateKPIs } from "../src/services/stats";
import { fetchCSMState } from "../src/services/stats/apiStats";
import type { CSMState, CSMHistoryPoint } from "../src/services/stats/csmAnalyzer";

type CSMDiscipline = "boulder" | "rope";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_CARD_HEIGHT = 440;

export default function AnalysisTab() {
  const navigation = useNavigation();
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      headerShown: true,
      title: tr("分析", "Analysis"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router]);

  const { logs, sessions: logSessions } = useLogsStore();
  const kpis = useMemo(() => calculateKPIs(logs, logSessions), [logs, logSessions]);

  // --- Chart swipe ---
  const [chartPage, setChartPage] = useState(0);
  const chartScrollRef = useRef<ScrollView>(null);

  // --- CSM state ---
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

  // --- CSM help bottom sheet ---
  const csmHelpRef = useRef<TrueSheet>(null);

  // --- Chart carousel data ---
  const chartCards = [
    { key: "volume", component: <TrainingVolumeChart /> },
    { key: "pyramid", component: <GradePyramid /> },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
    >
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

      {/* Charts: horizontal swipe carousel (full-width) */}
      <View style={styles.dotRow}>
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
          {chartCards.map((card) => (
            <View
              key={card.key}
              style={{ width: SCREEN_WIDTH, paddingHorizontal: 16, height: CHART_CARD_HEIGHT }}
            >
              {card.component}
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── CSM Section ── */}
      <View style={styles.csmSectionHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.csmSectionTitle}>{tr("攀爬状态模型", "Climb State Model")}</Text>
          <TouchableOpacity onPress={() => csmHelpRef.current?.present()} hitSlop={8}>
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

      {/* CSM data source annotation */}
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
      <TrueSheet
        ref={csmHelpRef}
        detents={[0.4, 0.9]}
        backgroundColor={colors.sheetBackground}
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        dimmed
        dimmedDetentIndex={0}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetHeaderTitle}>{tr("攀爬状态模型", "Climb State Model")}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetBody}>
            <Text style={styles.sheetBodyText}>
              {tr(
                "CSM（攀爬状态模型）基于你最近 6 周的完成行为结构，分析你在能力边缘的完成稳定性与极限推进度，而非单纯评估极限成绩。",
                "CSM (Climb State Model) analyzes your send stability and limit pushing at your performance edge over the last 6 weeks, rather than simply evaluating peak grades."
              )}
            </Text>

            <View>
              <Text style={styles.sheetSectionTitle}>{tr("能力边缘（Edge Zone）", "Edge Zone")}</Text>
              <Text style={styles.sheetBodyText}>
                {tr(
                  "你开始需要更多尝试、或经常感觉 \"hard\" 的等级区间。这是训练最有价值的区域，CSM 的核心指标都围绕这个区间计算。",
                  "The grade range where you need more attempts or often feel \"hard\". This is your most valuable training zone — all CSM metrics are calculated around it."
                )}
              </Text>
            </View>

            <View>
              <Text style={[styles.sheetSectionTitle, { marginBottom: 8 }]}>{tr("五项核心指标", "Five Core Metrics")}</Text>
              <View style={{ gap: 8 }}>
                <View>
                  <Text style={styles.sheetMetricTitle}>{tr("PI — Performance Index（表现指数）", "PI — Performance Index")}</Text>
                  <Text style={styles.sheetMetricDesc}>
                    {tr(
                      "取你最高难度的 5 次完攀，按时间衰减加权平均。代表你近期稳定的最高能力水平，而非单次最好成绩。",
                      "Weighted average of your top 5 sends with time decay. Represents your stable peak ability, not a single best performance."
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={styles.sheetMetricTitle}>{tr("EL — Effort Level（训练强度）", "EL — Effort Level")}</Text>
                  <Text style={styles.sheetMetricDesc}>
                    {tr(
                      "所有攀爬的平均难度与 PI 的比值。代表你近期训练的挑战位置（而非训练量）— 越高说明训练越接近极限。",
                      "Ratio of average climb difficulty to PI. Shows how close to your limit you're training — higher means more challenging sessions."
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={styles.sheetMetricTitle}>{tr("CE — Conversion Efficiency（转化效率）", "CE — Conversion Efficiency")}</Text>
                  <Text style={styles.sheetMetricDesc}>
                    {tr(
                      "在能力边缘区间内的完攀率（完攀次数 / 总尝试次数）。高 CE 说明你能高效地将尝试转化为完成；低 CE 意味着成本偏高或动作模式不稳定。",
                      "Send rate in your edge zone (sends / total attempts). High CE means efficient conversion; low CE suggests inconsistent movement patterns."
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={styles.sheetMetricTitle}>{tr("LP — Limit Pushing（极限推进）", "LP — Limit Pushing")}</Text>
                  <Text style={styles.sheetMetricDesc}>
                    {tr(
                      "你在能力边缘及以上等级的攀爬占比。LP 越高，说明你花越多时间在极限附近训练；LP 低则说明大部分训练在舒适区。",
                      "Proportion of climbs at or above your edge zone. Higher LP means more time near your limit; lower LP means mostly comfort-zone climbing."
                    )}
                  </Text>
                </View>
                <View>
                  <Text style={styles.sheetMetricTitle}>{tr("SS — Success Stability（完成稳定性）", "SS — Success Stability")}</Text>
                  <Text style={styles.sheetMetricDesc}>
                    {tr(
                      "基于 CE 修正而来（两者相关，但 SS 额外考虑主观体感）。经常标记 \"solid\" 会提升 SS，频繁标记 \"hard\" 则降低。反映你在边缘等级的表现是否稳定可复现。",
                      "Derived from CE with subjective feel adjustments. Marking \"solid\" boosts SS; \"hard\" lowers it. Reflects whether your edge-zone performance is stable and repeatable."
                    )}
                  </Text>
                </View>
              </View>
            </View>

            <View>
              <Text style={styles.sheetSectionTitle}>{tr("四象限状态地图", "Four-Quadrant State Map")}</Text>
              <Text style={[styles.sheetMetricDesc, { marginBottom: 8 }]}>
                {tr(
                  "横轴 = LP（极限推进），纵轴 = SS（完成稳定性）。根据两者的组合，系统将你归入四种训练状态：",
                  "X-axis = LP (Limit Pushing), Y-axis = SS (Success Stability). Based on their combination, you fall into one of four training states:"
                )}
              </Text>
              <View style={{ gap: 8 }}>
                {([
                  {
                    key: "push",
                    label: tr("Push（稳步突破）", "Push"),
                    desc: tr(
                      "稳定 + 推进高：你在边缘等级表现稳定且投入充足，可以挑战更高等级",
                      "Stable + high pushing: solid edge-zone performance with enough effort — ready for harder grades"
                    ),
                  },
                  {
                    key: "challenge",
                    label: tr("Challenge（挑战过度）", "Challenge"),
                    desc: tr(
                      "不稳定 + 推进高：频繁在极限挣扎但完成模式不稳，建议拆解动作或降级巩固",
                      "Unstable + high pushing: struggling at limits with inconsistent sends — consider breaking down moves or consolidating"
                    ),
                  },
                  {
                    key: "develop",
                    label: tr("Develop（蓄势待发）", "Develop"),
                    desc: tr(
                      "稳定 + 推进低：基础扎实但缺少边缘刺激，适合增加更多极限尝试",
                      "Stable + low pushing: strong base but lacking edge stimulus — add more limit attempts"
                    ),
                  },
                  {
                    key: "rebuild",
                    label: tr("Rebuild（基础巩固）", "Rebuild"),
                    desc: tr(
                      "不稳定 + 推进低：训练刺激和稳定性都不足，建议回到舒适区积累量和信心",
                      "Unstable + low pushing: both stimulus and stability are low — rebuild volume and confidence in comfort zone"
                    ),
                  },
                ] as const).map((q) => (
                  <View key={q.key} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: CSM_STATE_COLORS[q.key], marginTop: 4 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetQuadrantLabel}>{q.label}</Text>
                      <Text style={styles.sheetMetricDesc}>{q.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sheetDisclaimer}>
              <Text style={styles.sheetDisclaimerTitle}>
                {tr("重要声明", "Disclaimer")}
              </Text>
              <Text style={styles.sheetMetricDesc}>
                {tr(
                  "CSM 仅为基于攀爬完成行为的统计模型，所有指标均通过数学公式从你的记录数据中计算得出。本模型不具备任何医疗诊断或专业训练指导意义，不能替代教练或医疗专业人士的建议。请根据自身身体状况合理安排训练计划，注意休息和恢复，切忌过度训练导致受伤。",
                  "CSM is a statistical model based on climbing send behavior. All metrics are mathematically derived from your logged data. This model is not medical advice or professional coaching — it cannot replace guidance from a coach or healthcare professional. Train according to your body's condition, rest adequately, and avoid overtraining."
                )}
              </Text>
            </View>
          </View>
        </ScrollView>
      </TrueSheet>

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
  // Chart carousel
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
  // CSM section
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
  // TrueSheet help styles
  sheetHeader: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  sheetHeaderTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    textAlign: "center" as const,
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  sheetBodyText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sheetSectionTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sheetMetricTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  sheetMetricDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sheetQuadrantLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  sheetDisclaimer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
  },
  sheetDisclaimerTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    fontFamily: theme.fonts.bold,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
