import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CoachMode, CoachPhase } from "../types";
import { useSettings } from "../../../contexts/SettingsContext";

const PHASE_LABELS: Record<CoachPhase, { zh: string; en: string }> = {
  collect: { zh: "收集信息", en: "Collecting info" },
  draft: { zh: "生成草案", en: "Drafting plan" },
  complete: { zh: "计划已生成", en: "Plan generated" },
  match: { zh: "匹配动作", en: "Matching exercises" },
  schedule: { zh: "排课进阶", en: "Scheduling" },
};

const MODE_CONFIG: Record<Exclude<CoachMode, "none">, { icon: string; zh: string; en: string }> = {
  plan: { icon: "calendar-outline", zh: "Plan Mode", en: "Plan Mode" },
  actions: { icon: "barbell-outline", zh: "Actions", en: "Actions" },
  analysis: { icon: "analytics-outline", zh: "Analysis", en: "Analysis" },
};

type Props = {
  mode: Exclude<CoachMode, "none">;
  phase: CoachPhase;
  onExpand: () => void;
};

export default function ModeIndicator({ mode, phase, onExpand }: Props) {
  const { tr } = useSettings();
  const config = MODE_CONFIG[mode];

  const subtitle =
    mode === "plan"
      ? tr(PHASE_LABELS[phase].zh, PHASE_LABELS[phase].en)
      : mode === "actions"
        ? tr("动作推荐", "Exercise Recommendations")
        : tr("训练分析", "Training Analysis");

  return (
    <Pressable
      onPress={onExpand}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        height: 40,
        borderRadius: 12,
        backgroundColor: pressed ? "rgba(11,18,32,0.95)" : "#0B1220",
        borderWidth: 0.8,
        borderColor: "rgba(48,110,111,0.4)",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        gap: 8,
      })}
    >
      <Ionicons name={config.icon as any} size={16} color="#306E6F" />
      <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>
        {config[tr("zh", "en") === "zh" ? "zh" : "en"]}
      </Text>
      <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>·</Text>
      <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, flex: 1 }} numberOfLines={1}>
        {subtitle}
      </Text>
      <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.5)" />
    </Pressable>
  );
}
