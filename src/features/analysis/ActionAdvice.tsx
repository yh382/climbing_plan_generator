import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "../../lib/useThemeColors";
import { scoreToGrade } from "../../lib/gradeSystem";
import { useSettings } from "../../contexts/SettingsContext";
import type { CSMState, CSMHistoryPoint } from "../../services/stats/csmAnalyzer";
import type { GradeSystem } from "../../types/climbLog";

// ---- Types ----

interface AdviceItem {
  id: string;
  priority: number;
  zh: string;
  en: string;
}

interface AdviceContext {
  state: CSMState;
  history: CSMHistoryPoint[];
  lowerGrade: string;
  upperGrade: string;
}

interface AdviceRule {
  id: string;
  priority: number;
  condition: (ctx: AdviceContext) => boolean;
  text: (ctx: AdviceContext) => { zh: string; en: string };
}

// ---- Helpers ----

function gradeSendRate(g: { sends: number; totalTries: number }): number {
  return g.totalTries > 0 ? g.sends / g.totalTries : 0;
}

function gradeText(score: number, discipline: "boulder" | "rope"): string {
  try {
    const system: GradeSystem = discipline === "boulder" ? "vscale" : "yds";
    return scoreToGrade(Math.round(score), system);
  } catch {
    return String(Math.round(score));
  }
}

function trend(history: CSMHistoryPoint[], key: "lp" | "ss"): "up" | "down" | "flat" {
  if (history.length < 3) return "flat";
  const recent = history.slice(-3);
  const d1 = recent[1][key] - recent[0][key];
  const d2 = recent[2][key] - recent[1][key];
  if (d1 > 0.02 && d2 > 0.02) return "up";
  if (d1 < -0.02 && d2 < -0.02) return "down";
  return "flat";
}

// ---- Rules ----

const RULES: AdviceRule[] = [
  {
    id: "qsr_high",
    priority: 90,
    condition: ({ state }) => state.edgeZone.qsr > 0.5,
    text: ({ upperGrade }) => ({
      zh: `Edge zone 大部分路线 ≤2 次完成，可以冲 ${upperGrade}+`,
      en: `Most edge zone routes sent in ≤2 tries — ready to push ${upperGrade}+`,
    }),
  },
  {
    id: "bottleneck_grade",
    priority: 88,
    condition: ({ state }) => {
      const grades = state.edgeZone.grades.filter((g) => g.totalTries >= 2);
      return grades.some((g) => gradeSendRate(g) < 0.3);
    },
    text: ({ state }) => {
      const worst = state.edgeZone.grades
        .filter((g) => g.totalTries >= 2)
        .sort((a, b) => gradeSendRate(a) - gradeSendRate(b))[0];
      const rate = Math.round(gradeSendRate(worst) * 100);
      return {
        zh: `${worst.gradeText} 转化率仅 ${rate}%，是当前瓶颈`,
        en: `${worst.gradeText} conversion only ${rate}% — current bottleneck`,
      };
    },
  },
  {
    id: "pr_high",
    priority: 85,
    condition: ({ state }) => state.edgeZone.pr > 0.35,
    text: ({ state, lowerGrade }) => {
      const pct = Math.round(state.edgeZone.pr * 100);
      return {
        zh: `${pct}% edge zone 路线需 5+ 次尝试，增加 ${lowerGrade} 的量`,
        en: `${pct}% of edge zone sends need 5+ tries — add volume at ${lowerGrade}`,
      };
    },
  },
  {
    id: "avg_tries_high",
    priority: 82,
    condition: ({ state }) => {
      return state.edgeZone.grades.some((g) => g.avgTries >= 4 && g.totalTries >= 3);
    },
    text: ({ state }) => {
      const hard = state.edgeZone.grades
        .filter((g) => g.avgTries >= 4 && g.totalTries >= 3)
        .sort((a, b) => b.avgTries - a.avgTries)[0];
      return {
        zh: `${hard.gradeText} 平均每次完成需 ${hard.avgTries} 次尝试，考虑针对性练习`,
        en: `${hard.gradeText} averages ${hard.avgTries} tries per send — consider projecting techniques`,
      };
    },
  },
  {
    id: "ce_low",
    priority: 80,
    condition: ({ state }) => state.ce < 0.3,
    text: () => ({
      zh: "转化率偏低，增加 edge zone 内练习量",
      en: "Low conversion — add more practice in your edge zone",
    }),
  },
  {
    id: "ss_declining",
    priority: 78,
    condition: ({ history }) => trend(history, "ss") === "down",
    text: () => ({
      zh: "完成稳定性在下滑，考虑休息或降级训练",
      en: "Send stability declining — consider rest or easier grades",
    }),
  },
  {
    id: "qsr_low",
    priority: 76,
    condition: ({ state }) => state.edgeZone.qsr < 0.3,
    text: () => ({
      zh: "快速完成率低，大部分路线需 3+ 次尝试",
      en: "Few quick sends — most routes need 3+ tries",
    }),
  },
  {
    id: "el_high",
    priority: 75,
    condition: ({ state }) => state.el > 0.85,
    text: () => ({
      zh: "训练强度很高，注意恢复和休息",
      en: "Training intensity is very high — watch for fatigue",
    }),
  },
  {
    id: "lp_declining",
    priority: 72,
    condition: ({ history }) => trend(history, "lp") === "down",
    text: ({ lowerGrade }) => ({
      zh: `极限推进度在下降，多尝试 ${lowerGrade} 以上路线`,
      en: `Limit pushing declining — try more routes above ${lowerGrade}`,
    }),
  },
  {
    id: "ce_high",
    priority: 70,
    condition: ({ state }) => state.ce > 0.65,
    text: () => ({
      zh: "转化效率很高，可以尝试更高难度",
      en: "High conversion efficiency — try harder grades",
    }),
  },
  {
    id: "grade_spread",
    priority: 68,
    condition: ({ state }) => {
      const grades = state.edgeZone.grades.filter((g) => g.totalTries >= 2);
      if (grades.length < 2) return false;
      const rates = grades.map((g) => gradeSendRate(g));
      return Math.max(...rates) - Math.min(...rates) > 0.3;
    },
    text: ({ state }) => {
      const grades = state.edgeZone.grades.filter((g) => g.totalTries >= 2);
      const sorted = [...grades].sort((a, b) => gradeSendRate(b) - gradeSendRate(a));
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const bRate = Math.round(gradeSendRate(best) * 100);
      const wRate = Math.round(gradeSendRate(worst) * 100);
      return {
        zh: `${best.gradeText} (${bRate}%) 与 ${worst.gradeText} (${wRate}%) 差距大，加强薄弱难度`,
        en: `Big gap between ${best.gradeText} (${bRate}%) and ${worst.gradeText} (${wRate}%) — focus on weaker grades`,
      };
    },
  },
  {
    id: "el_low",
    priority: 65,
    condition: ({ state }) => state.el < 0.5,
    text: () => ({
      zh: "训练强度偏低，大部分时间在舒适区",
      en: "Training intensity is low — most time spent in comfort zone",
    }),
  },
  {
    id: "lp_rising",
    priority: 60,
    condition: ({ history }) => trend(history, "lp") === "up",
    text: () => ({
      zh: "极限推进度在上升，保持当前节奏",
      en: "Limit pushing trending up — keep the momentum",
    }),
  },
  {
    id: "stable_grade",
    priority: 55,
    condition: ({ state }) => {
      const grades = state.edgeZone.grades.filter((g) => g.totalTries >= 3);
      return grades.some((g) => gradeSendRate(g) > 0.6);
    },
    text: ({ state }) => {
      const best = state.edgeZone.grades
        .filter((g) => g.totalTries >= 3)
        .sort((a, b) => gradeSendRate(b) - gradeSendRate(a))[0];
      const rate = Math.round(gradeSendRate(best) * 100);
      return {
        zh: `${best.gradeText} 已很稳定 (${rate}%)，减少该难度，冲更高`,
        en: `${best.gradeText} is very stable (${rate}%) — reduce volume here, push higher`,
      };
    },
  },
  {
    id: "low_volume",
    priority: 50,
    condition: ({ state }) => state.logCount < 8,
    text: () => ({
      zh: "近6周数据量少，增加训练频次提升分析准确度",
      en: "Low data volume in last 6 weeks — more sessions improve accuracy",
    }),
  },
];

function generateAdvice(ctx: AdviceContext): AdviceItem[] {
  const items: AdviceItem[] = [];
  for (const rule of RULES) {
    if (rule.condition(ctx)) {
      const { zh, en } = rule.text(ctx);
      items.push({ id: rule.id, priority: rule.priority, zh, en });
    }
  }
  items.sort((a, b) => b.priority - a.priority);
  return items.slice(0, 4);
}

// ---- Quadrant constants ----

const QUADRANT_COLORS: Record<string, string> = {
  push: "#10B981",
  challenge: "#F59E0B",
  develop: "#3B82F6",
  rebuild: "#EF4444",
};

const QUADRANT_LABELS: Record<string, { zh: string; en: string }> = {
  push: { zh: "突破", en: "Push" },
  challenge: { zh: "挑战", en: "Challenge" },
  develop: { zh: "蓄力", en: "Develop" },
  rebuild: { zh: "巩固", en: "Rebuild" },
};

const QUADRANT_SUMMARIES: Record<string, { zh: string; en: string }> = {
  push: {
    zh: "你正在稳步突破极限！保持当前训练节奏。",
    en: "Steadily pushing your limits! Keep this rhythm.",
  },
  challenge: {
    zh: "在挑战高难度但成功率偏低。",
    en: "Challenging hard grades but success rate is low.",
  },
  develop: {
    zh: "完成率很强，是时候冲更高了！",
    en: "Send rate is strong — time to push harder!",
  },
  rebuild: {
    zh: "建议在低难度巩固信心。",
    en: "Consolidate at lower grades to rebuild confidence.",
  },
};

// ---- Component ----

interface Props {
  state: CSMState;
  history?: CSMHistoryPoint[];
}

export default function ActionAdvice({ state, history = [] }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const quadColor = QUADRANT_COLORS[state.quadrant] || QUADRANT_COLORS.rebuild;
  const quadLabel = QUADRANT_LABELS[state.quadrant] || QUADRANT_LABELS.rebuild;
  const quadSummary = QUADRANT_SUMMARIES[state.quadrant] || QUADRANT_SUMMARIES.rebuild;

  const lowerGrade = gradeText(state.edgeZone.lower, state.discipline);
  const upperGrade = gradeText(state.pi, state.discipline);

  const adviceItems = useMemo(
    () => generateAdvice({ state, history, lowerGrade, upperGrade }),
    [state, history, lowerGrade, upperGrade],
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>{tr("训练建议", "Training Advice")}</Text>
        <View style={[styles.badge, { backgroundColor: quadColor + "18" }]}>
          <Text style={[styles.badgeText, { color: quadColor }]}>
            {tr(quadLabel.zh, quadLabel.en)}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>{tr(quadSummary.zh, quadSummary.en)}</Text>

      <View style={styles.tipsContainer}>
        {adviceItems.map((item) => (
          <View key={item.id} style={styles.tipRow}>
            <View style={[styles.tipDot, { backgroundColor: quadColor }]} />
            <Text style={styles.tipText}>{tr(item.zh, item.en)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.chartTitle,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summary: {
    fontSize: 13,
    color: colors.chartValue,
    lineHeight: 20,
    marginBottom: 14,
  },
  tipsContainer: {
    gap: 10,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: colors.chartValue,
    lineHeight: 18,
  },
});
