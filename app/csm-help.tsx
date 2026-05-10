// app/csm-help.tsx
// Native iOS formSheet route explaining the Climb State Model (CSM).
// Migrated from in-AnalysisScreen TrueSheet (sheet-container-audit A1).
// Stack.Screen presentation + nav bar (Liquid Glass on iOS 26) configured
// at root level in app/_layout.tsx.

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { CSM_STATE_COLORS, theme } from "@/lib/theme";

// formSheet config lives in app/_layout.tsx — in-screen <Stack.Screen options>
// REPLACES (not merges) parent options in this Expo Router version, blowing
// away presentation:"formSheet" + sheetAllowedDetents + headerLeft xmark.
// Use setOptions for i18n title override (it merges correctly).

export default function CsmHelpRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const navigation = useNavigation();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    navigation.setOptions({ title: tr("攀爬状态模型", "Climb State Model") });
  }, [navigation, tr]);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
          <Text style={styles.bodyText}>
            {tr(
              "CSM（攀爬状态模型）基于你最近 6 周的完成行为结构，分析你在能力边缘的完成稳定性与极限推进度，而非单纯评估极限成绩。",
              "CSM (Climb State Model) analyzes your send stability and limit pushing at your performance edge over the last 6 weeks, rather than simply evaluating peak grades."
            )}
          </Text>

          <View>
            <Text style={styles.sectionTitle}>{tr("能力边缘（Edge Zone）", "Edge Zone")}</Text>
            <Text style={styles.bodyText}>
              {tr(
                "你开始需要更多尝试、或经常感觉 \"hard\" 的等级区间。这是训练最有价值的区域，CSM 的核心指标都围绕这个区间计算。",
                "The grade range where you need more attempts or often feel \"hard\". This is your most valuable training zone — all CSM metrics are calculated around it."
              )}
            </Text>
          </View>

          <View>
            <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>{tr("五项核心指标", "Five Core Metrics")}</Text>
            <View style={{ gap: 8 }}>
              <View>
                <Text style={styles.metricTitle}>{tr("PI — Performance Index（表现指数）", "PI — Performance Index")}</Text>
                <Text style={styles.metricDesc}>
                  {tr(
                    "取你最高难度的 5 次完攀，按时间衰减加权平均。代表你近期稳定的最高能力水平，而非单次最好成绩。",
                    "Weighted average of your top 5 sends with time decay. Represents your stable peak ability, not a single best performance."
                  )}
                </Text>
              </View>
              <View>
                <Text style={styles.metricTitle}>{tr("EL — Effort Level（训练强度）", "EL — Effort Level")}</Text>
                <Text style={styles.metricDesc}>
                  {tr(
                    "所有攀爬的平均难度与 PI 的比值。代表你近期训练的挑战位置（而非训练量）— 越高说明训练越接近极限。",
                    "Ratio of average climb difficulty to PI. Shows how close to your limit you're training — higher means more challenging sessions."
                  )}
                </Text>
              </View>
              <View>
                <Text style={styles.metricTitle}>{tr("CE — Conversion Efficiency（转化效率）", "CE — Conversion Efficiency")}</Text>
                <Text style={styles.metricDesc}>
                  {tr(
                    "在能力边缘区间内的完攀率（完攀次数 / 总尝试次数）。高 CE 说明你能高效地将尝试转化为完成；低 CE 意味着成本偏高或动作模式不稳定。",
                    "Send rate in your edge zone (sends / total attempts). High CE means efficient conversion; low CE suggests inconsistent movement patterns."
                  )}
                </Text>
              </View>
              <View>
                <Text style={styles.metricTitle}>{tr("LP — Limit Pushing（极限推进）", "LP — Limit Pushing")}</Text>
                <Text style={styles.metricDesc}>
                  {tr(
                    "你在能力边缘及以上等级的攀爬占比。LP 越高，说明你花越多时间在极限附近训练；LP 低则说明大部分训练在舒适区。",
                    "Proportion of climbs at or above your edge zone. Higher LP means more time near your limit; lower LP means mostly comfort-zone climbing."
                  )}
                </Text>
              </View>
              <View>
                <Text style={styles.metricTitle}>{tr("SS — Success Stability（完成稳定性）", "SS — Success Stability")}</Text>
                <Text style={styles.metricDesc}>
                  {tr(
                    "基于 CE 修正而来（两者相关，但 SS 额外考虑主观体感）。经常标记 \"solid\" 会提升 SS，频繁标记 \"hard\" 则降低。反映你在边缘等级的表现是否稳定可复现。",
                    "Derived from CE with subjective feel adjustments. Marking \"solid\" boosts SS; \"hard\" lowers it. Reflects whether your edge-zone performance is stable and repeatable."
                  )}
                </Text>
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.sectionTitle}>{tr("四象限状态地图", "Four-Quadrant State Map")}</Text>
            <Text style={[styles.metricDesc, { marginBottom: 8 }]}>
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
                    <Text style={styles.quadrantLabel}>{q.label}</Text>
                    <Text style={styles.metricDesc}>{q.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>
              {tr("重要声明", "Disclaimer")}
            </Text>
            <Text style={styles.metricDesc}>
              {tr(
                "CSM 仅为基于攀爬完成行为的统计模型，所有指标均通过数学公式从你的记录数据中计算得出。本模型不具备任何医疗诊断或专业训练指导意义，不能替代教练或医疗专业人士的建议。请根据自身身体状况合理安排训练计划，注意休息和恢复，切忌过度训练导致受伤。",
                "CSM is a statistical model based on climbing send behavior. All metrics are mathematically derived from your logged data. This model is not medical advice or professional coaching — it cannot replace guidance from a coach or healthcare professional. Train according to your body's condition, rest adequately, and avoid overtraining."
              )}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 16,
    },
    bodyText: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700" as const,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    metricTitle: {
      fontSize: 13,
      fontWeight: "600" as const,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    metricDesc: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    quadrantLabel: {
      fontSize: 12,
      fontWeight: "700" as const,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    disclaimer: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      padding: 12,
    },
    disclaimerTitle: {
      fontSize: 12,
      fontWeight: "700" as const,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      marginBottom: 4,
    },
  });
