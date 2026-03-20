import React, { useEffect } from "react";
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import type { CoachMode, DraftPlan, PlanSummary, RecommendedActions, SessionDetail } from "../types";
import { useSettings } from "../../../contexts/SettingsContext";
import { useCoachChatStore } from "../state/coachChatStore";
import { checklistApi } from "../api";

const INDICATOR_HEIGHT = 40;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.75;

const QUICK_ACTIONS = [
  { zh: "无挂板替代方案", en: "No hangboard alternatives" },
  { zh: "热身建议", en: "Warm-up ideas" },
  { zh: "手指力量训练", en: "Finger strength" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: CoachMode;
  plan: DraftPlan | null;
  planSummary: PlanSummary | null;
  recommendedActions: RecommendedActions | null;
};

export default function ModeDetailOverlay({ visible, onClose, mode, plan, planSummary, recommendedActions }: Props) {
  const { tr } = useSettings();
  const sendFromDock = useCoachChatStore((s) => s.sendFromDock);
  const router = useRouter();

  const scale = useSharedValue(0.98);
  const translateY = useSharedValue(10);
  const height = useSharedValue(INDICATOR_HEIGHT);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(withTiming(1, { duration: 120 }));
      translateY.value = withSequence(withTiming(0, { duration: 120 }));
      height.value = withSequence(
        withTiming(INDICATOR_HEIGHT, { duration: 120 }),
        withTiming(EXPANDED_HEIGHT, { duration: 200 }),
      );
    } else {
      height.value = withSequence(withTiming(INDICATOR_HEIGHT, { duration: 200 }));
      scale.value = withTiming(0.98, { duration: 120 });
      translateY.value = withTiming(10, { duration: 120 });
    }
  }, [visible, scale, translateY, height]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    height: height.value,
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.25)" }]} />
      </Pressable>

      <Animated.View style={[styles.card, cardStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === "plan"
              ? tr("训练计划", "Training Plan")
              : mode === "actions"
                ? tr("动作推荐", "Actions")
                : tr("训练分析", "Analysis")}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        {mode === "plan" && (
          <PlanContent
            plan={plan}
            planSummary={planSummary}
            tr={tr}
            onViewPlan={planSummary ? () => {
              onClose();
              router.push(`/library/plan-overview?planId=${planSummary.planId}&source=coach` as any);
            } : undefined}
          />
        )}
        {mode === "actions" && (
          <ActionsContent
            tr={tr}
            sendFromDock={sendFromDock}
            recommendedActions={recommendedActions}
            onClose={onClose}
            router={router}
          />
        )}
        {mode === "analysis" && <AnalysisContent tr={tr} />}
      </Animated.View>
    </Modal>
  );
}

const BLOCK_LABELS: Record<string, { zh: string; en: string }> = {
  main_strength: { zh: "力量", en: "Strength" },
  main_finger_strength: { zh: "指力", en: "Finger" },
  finger_strength: { zh: "指力", en: "Finger" },
  main_endurance: { zh: "耐力", en: "Endurance" },
  main_power_endurance: { zh: "力耐", en: "Power End." },
  accessory_antagonist: { zh: "对抗肌", en: "Antagonist" },
  accessory_core: { zh: "核心", en: "Core" },
  accessory_mobility: { zh: "灵活性", en: "Mobility" },
  accessory_forearm: { zh: "前臂", en: "Forearm" },
  warmup_general: { zh: "热身", en: "Warmup" },
  warmup_full_body: { zh: "热身", en: "Warmup" },
  cooldown: { zh: "放松", en: "Cooldown" },
  regen: { zh: "恢复", en: "Recovery" },
  finger_care: { zh: "手指护理", en: "Finger Care" },
  skill: { zh: "技术", en: "Skill" },
};

function SessionCard({
  session,
  index,
  tr,
}: {
  session: SessionDetail;
  index: number;
  tr: (zh: string, en: string) => string;
}) {
  const icon = session.type === "climb" ? "fitness-outline" : "barbell-outline";
  const label = session.type === "climb"
    ? tr("攀岩日", "Climb Day")
    : tr("训练日", "Train Day");

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Ionicons name={icon as any} size={14} color="rgba(255,255,255,0.7)" />
        <Text style={styles.sessionTitle}>
          {label} {index + 1}
        </Text>
        <Text style={styles.exerciseCount}>
          {session.exercises.length} {tr("动作", "exercises")}
        </Text>
      </View>
      {session.exercises.map((ex, i) => {
        const blockLabel = BLOCK_LABELS[ex.blockType];
        return (
          <View key={`${ex.blockType}-${i}`} style={styles.exerciseRow}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {tr(ex.name.zh, ex.name.en)}
            </Text>
            {blockLabel && (
              <Text style={styles.blockTag}>{tr(blockLabel.zh, blockLabel.en)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function PlanContent({
  plan,
  planSummary,
  tr,
  onViewPlan,
}: {
  plan: DraftPlan | null;
  planSummary: PlanSummary | null;
  tr: (zh: string, en: string) => string;
  onViewPlan?: () => void;
}) {
  // Plan generated — show detailed breakdown
  if (planSummary) {
    const sessions = planSummary.sessions || [];
    const weekFocuses = planSummary.weekFocuses || [];
    const climbSessions = sessions.filter((s) => s.type === "climb");
    const trainSessions = sessions.filter((s) => s.type === "train");

    return (
      <>
        {/* Compact summary line */}
        <Text style={styles.summaryLine}>
          {tr(
            `${planSummary.weeks} 周 · 每周 ${planSummary.sessionsPerWeek} 天 · ${planSummary.totalExercises} 个动作`,
            `${planSummary.weeks}wk · ${planSummary.sessionsPerWeek} days/wk · ${planSummary.totalExercises} exercises`,
          )}
        </Text>

        <ScrollView style={{ flex: 1, marginTop: 12 }} showsVerticalScrollIndicator={false}>
          {/* Session cards */}
          {climbSessions.map((s, i) => (
            <SessionCard key={`climb-${i}`} session={s} index={i} tr={tr} />
          ))}
          {trainSessions.map((s, i) => (
            <SessionCard key={`train-${i}`} session={s} index={i} tr={tr} />
          ))}

          {/* Week timeline */}
          {weekFocuses.length > 0 && (
            <View style={styles.weekSection}>
              <Text style={styles.weekSectionTitle}>
                {tr("周期化安排", "Periodization")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.weekTimeline}>
                  {weekFocuses.map((wf, i) => (
                    <View key={wf.week} style={styles.weekChip}>
                      <Text style={styles.weekChipWeek}>W{wf.week}</Text>
                      <Text style={styles.weekChipText} numberOfLines={1}>
                        {tr(wf.focus.zh, wf.focus.en)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {onViewPlan && (
          <Pressable
            onPress={onViewPlan}
            style={({ pressed }) => [styles.viewPlanBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="open-outline" size={16} color="#FFF" />
            <Text style={styles.viewPlanText}>
              {tr("查看完整计划", "View Full Plan")}
            </Text>
          </Pressable>
        )}
      </>
    );
  }

  // Still collecting — show bullets from draft if available, otherwise placeholder
  if (!plan) {
    return (
      <Text style={styles.subtitle}>
        {tr("AI 正在收集信息，计划将在这里展示...", "AI is collecting info, plan will appear here...")}
      </Text>
    );
  }

  return (
    <>
      <Text style={styles.subtitle}>{plan.subtitle}</Text>
      <ScrollView style={{ flex: 1, marginTop: 16 }} showsVerticalScrollIndicator={false}>
        {plan.bullets.map((b, idx) => (
          <View key={`${idx}-${b}`} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function ActionsContent({
  tr,
  sendFromDock,
  recommendedActions,
  onClose,
  router,
}: {
  tr: (zh: string, en: string) => string;
  sendFromDock: (t: string) => void;
  recommendedActions: RecommendedActions | null;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [saving, setSaving] = React.useState(false);

  const handleSaveChecklist = async () => {
    if (!recommendedActions || saving) return;
    setSaving(true);
    try {
      await checklistApi.save({
        title: recommendedActions.focus,
        actions: recommendedActions.actions.map((a) => ({
          action_id: a.actionId,
          name: a.name,
          block_type: a.blockType,
          level: a.level,
          reason: a.reason,
        })),
      });
      Alert.alert(tr("已保存", "Saved"), tr("动作清单已保存", "Checklist saved successfully"));
    } catch {
      Alert.alert(tr("保存失败", "Save Failed"), tr("请稍后重试", "Please try again"));
    } finally {
      setSaving(false);
    }
  };

  // State A: Has recommendations — show action cards
  if (recommendedActions && recommendedActions.actions.length > 0) {
    return (
      <>
        <Text style={styles.actionsFocus}>{recommendedActions.focus}</Text>
        <ScrollView style={{ flex: 1, marginTop: 10 }} showsVerticalScrollIndicator={false}>
          {recommendedActions.actions.map((action) => {
            const blockLabel = BLOCK_LABELS[action.blockType];
            return (
              <Pressable
                key={action.actionId}
                style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  onClose();
                  router.push(`/library/exercise-detail?exerciseId=${action.actionId}&context=library` as any);
                }}
              >
                <View style={styles.actionCardHeader}>
                  <Text style={styles.actionName} numberOfLines={1}>
                    {tr(action.name.zh, action.name.en)}
                  </Text>
                  <View style={styles.actionMeta}>
                    {blockLabel && (
                      <Text style={styles.actionBlockTag}>
                        {tr(blockLabel.zh, blockLabel.en)}
                      </Text>
                    )}
                    {action.durationMin && (
                      <Text style={styles.actionDuration}>~{action.durationMin}min</Text>
                    )}
                  </View>
                </View>
                {!!action.reason && (
                  <Text style={styles.actionReason} numberOfLines={2}>
                    {action.reason}
                  </Text>
                )}
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="rgba(255,255,255,0.3)"
                  style={styles.actionChevron}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={handleSaveChecklist}
          disabled={saving}
          style={({ pressed }) => [styles.saveChecklistBtn, pressed && { opacity: 0.8 }, saving && { opacity: 0.5 }]}
        >
          <Ionicons name="bookmark-outline" size={16} color="#FFF" />
          <Text style={styles.saveChecklistText}>
            {saving ? tr("保存中...", "Saving...") : tr("保存为动作清单", "Save as Checklist")}
          </Text>
        </Pressable>
      </>
    );
  }

  // State B: No recommendations — show quick chips
  return (
    <>
      <Text style={styles.subtitle}>
        {tr("让 Paddi 推荐或替换训练动作", "Ask Paddi to recommend or swap exercises")}
      </Text>
      <View style={styles.chipsRow}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.en}
            onPress={() => sendFromDock(a.en)}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.chipText}>{tr(a.zh, a.en)}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function AnalysisContent({ tr }: { tr: (zh: string, en: string) => string }) {
  const items = [
    { zh: "近7天训练量", en: "Last 7 days volume" },
    { zh: "强度趋势", en: "Intensity trend" },
    { zh: "恢复状态", en: "Recovery status" },
  ];

  return (
    <>
      <Text style={styles.subtitle}>
        {tr("查看你近期的训练数据", "Review your recent training data")}
      </Text>
      <ScrollView style={{ flex: 1, marginTop: 16 }} showsVerticalScrollIndicator={false}>
        {items.map((item, idx) => (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{tr(item.zh, item.en)}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.12,
    left: 16,
    right: 16,
    backgroundColor: "#0B1220",
    borderRadius: 22,
    padding: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    flex: 1,
    paddingRight: 12,
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 8,
    fontSize: 14,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  bulletDot: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  bulletText: {
    color: "rgba(255,255,255,0.85)",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 0.8,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  chipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryLine: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 8,
  },
  sessionCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sessionTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  exerciseCount: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  exerciseName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  blockTag: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
  },
  weekSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  weekSectionTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  weekTimeline: {
    flexDirection: "row",
    gap: 6,
  },
  weekChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    minWidth: 70,
  },
  weekChipWeek: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
  },
  weekChipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 2,
  },
  viewPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#306E6F",
  },
  viewPlanText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  actionsFocus: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
  },
  actionCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    position: "relative" as const,
  },
  actionCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  actionName: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  actionMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  actionBlockTag: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden" as const,
  },
  actionDuration: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  actionReason: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  actionChevron: {
    position: "absolute" as const,
    right: 10,
    top: "50%" as any,
    marginTop: -7,
  },
  saveChecklistBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#306E6F",
  },
  saveChecklistText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
