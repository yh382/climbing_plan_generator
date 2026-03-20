// app/library/plan-builder.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import TopBar from "../../components/TopBar";
import { plansApi } from "../../src/features/plans/api";
import { SessionAccordion } from "../../src/features/plans/components/SessionAccordion";
import { WeekSelector } from "../../src/features/plans/components/WeekSelector";
import { ExercisePickerModal } from "../../src/features/plans/components/ExercisePickerModal";
import type { PlanV3, PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";
import type { ActionSummary } from "../../src/features/home/exercises/model/types";

function detectLocale(): "zh" | "en" {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

function makeId() {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptySession(index: number): PlanV3Session {
  const id = makeId();
  return {
    id,
    session_id: id,
    type: "train",
    intensity: "moderate",
    blocks: [{ block_type: "main", items: [] }],
    name: `Session ${index + 1}`,
  };
}

const INTENSITY_OPTIONS = ["Light", "Moderate", "Hard", "Max"];

export default function PlanBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const locale = useMemo(() => detectLocale(), []);

  const [title, setTitle] = useState(locale === "zh" ? "我的自定义计划" : "My Custom Plan");
  const [weeks, setWeeks] = useState(4);
  const [sessLow, setSessLow] = useState(2); // displayed as "2~3"
  const [intensity, setIntensity] = useState("Moderate");
  const [metaOpen, setMetaOpen] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // Per-week sessions
  const [weekSessions, setWeekSessions] = useState<Record<number, PlanV3Session[]>>({
    1: [createEmptySession(0)],
  });

  const currentSessions = weekSessions[selectedWeek] ?? [];

  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Session counts per week for WeekSelector dots
  const sessionCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let w = 1; w <= weeks; w++) {
      counts[w] = weekSessions[w]?.length ?? 0;
    }
    return counts;
  }, [weekSessions, weeks]);

  // Listen for exercise added back from exercise-detail page
  useEffect(() => {
    const interval = setInterval(async () => {
      const pending = await AsyncStorage.getItem("__pending_exercise__");
      if (pending) {
        await AsyncStorage.removeItem("__pending_exercise__");
        try {
          const item = JSON.parse(pending) as PlanV3SessionItem;
          if (activeSessionIndex !== null) {
            addItemToSession(activeSessionIndex, item);
          }
        } catch { /* ignore */ }
      }
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionIndex, selectedWeek]);

  const addItemToSession = useCallback((sessionIdx: number, item: PlanV3SessionItem) => {
    setWeekSessions((prev) => {
      const weekList = [...(prev[selectedWeek] ?? [])];
      if (sessionIdx >= weekList.length) return prev;
      const session = { ...weekList[sessionIdx] };
      const blocks = [...session.blocks];
      if (blocks.length === 0) {
        blocks.push({ block_type: "main", items: [item] });
      } else {
        blocks[0] = { ...blocks[0], items: [...blocks[0].items, item] };
      }
      session.blocks = blocks;
      weekList[sessionIdx] = session;
      return { ...prev, [selectedWeek]: weekList };
    });
  }, [selectedWeek]);

  const removeItemFromSession = useCallback((sessionIdx: number, itemIdx: number) => {
    setWeekSessions((prev) => {
      const weekList = [...(prev[selectedWeek] ?? [])];
      if (sessionIdx >= weekList.length) return prev;
      const session = { ...weekList[sessionIdx] };
      const blocks = [...session.blocks];
      if (blocks.length > 0) {
        const items = [...blocks[0].items];
        items.splice(itemIdx, 1);
        blocks[0] = { ...blocks[0], items };
      }
      session.blocks = blocks;
      weekList[sessionIdx] = session;
      return { ...prev, [selectedWeek]: weekList };
    });
  }, [selectedWeek]);

  const addSession = () => {
    setWeekSessions((prev) => {
      const weekList = prev[selectedWeek] ?? [];
      return {
        ...prev,
        [selectedWeek]: [...weekList, createEmptySession(weekList.length)],
      };
    });
  };

  const removeSession = (idx: number) => {
    setWeekSessions((prev) => {
      const weekList = (prev[selectedWeek] ?? []).filter((_, i) => i !== idx);
      return { ...prev, [selectedWeek]: weekList };
    });
  };

  const moveExerciseInSession = useCallback((sessionIdx: number, fromIdx: number, direction: "up" | "down") => {
    setWeekSessions((prev) => {
      const weekList = [...(prev[selectedWeek] ?? [])];
      if (sessionIdx >= weekList.length) return prev;
      const session = { ...weekList[sessionIdx] };
      const blocks = [...session.blocks];
      if (blocks.length === 0) return prev;
      const items = [...blocks[0].items];
      const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0 || toIdx >= items.length) return prev;
      [items[fromIdx], items[toIdx]] = [items[toIdx], items[fromIdx]];
      blocks[0] = { ...blocks[0], items };
      session.blocks = blocks;
      weekList[sessionIdx] = session;
      return { ...prev, [selectedWeek]: weekList };
    });
  }, [selectedWeek]);

  const handlePickerSelect = (action: ActionSummary) => {
    setPickerVisible(false);
    if (activeSessionIndex === null) return;

    const item: PlanV3SessionItem = {
      action_id: action.id,
      name_override: { zh: action.name?.zh || "", en: action.name?.en || action.id },
      media: action.media || undefined,
      cues: action.cues ? { zh: action.cues.zh || "", en: action.cues.en || "" } : undefined,
    };
    addItemToSession(activeSessionIndex, item);
  };

  const handleOpenPicker = (sessionIdx: number) => {
    setActiveSessionIndex(sessionIdx);
    setPickerVisible(true);
  };

  const handleExercisePress = (sessionIdx: number, item: PlanV3SessionItem) => {
    setActiveSessionIndex(sessionIdx);
    router.push({
      pathname: "/library/exercise-detail",
      params: { exerciseId: item.action_id, context: "custom" },
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", locale === "zh" ? "请输入计划名称" : "Please enter a plan title");
      return;
    }

    // Gather all sessions across all weeks
    const allSessions = Object.values(weekSessions).flat();
    const totalExercises = allSessions.reduce(
      (sum, s) => sum + s.blocks.reduce((bs, b) => bs + b.items.length, 0),
      0
    );
    if (totalExercises === 0) {
      Alert.alert("Error", locale === "zh" ? "请至少添加一个动作" : "Please add at least one exercise");
      return;
    }

    setSaving(true);
    try {
      const climbSessions = allSessions.filter((s) => s.type === "climb");
      const trainSessions = allSessions.filter((s) => s.type === "train");

      // Parse average from range for rest calc
      const avgSess = sessLow + 0.5;

      const planJson: PlanV3 = {
        meta: {
          cycle_weeks: weeks,
          intensity,
          sess_range: `${sessLow}~${sessLow + 1}`,
          created_by: "custom_builder",
        },
        quotas: {
          climb: climbSessions.length,
          train: trainSessions.length,
          rest_suggested: Math.max(1, 7 - Math.ceil(avgSess)),
        },
        session_bank: {
          climb_sessions: climbSessions,
          train_sessions: trainSessions,
        },
      };

      await plansApi.createPlan({
        title: title.trim(),
        plan_json: planJson as unknown as Record<string, unknown>,
        source: "custom",
        visibility: "private",
        training_type: intensity.toLowerCase(),
        duration_weeks: weeks,
      });

      Alert.alert(
        locale === "zh" ? "成功" : "Success",
        locale === "zh" ? "计划已保存" : "Plan saved!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <TopBar
        routeName="plan_builder"
        title={locale === "zh" ? "自定义计划" : "Custom Plan"}
        useSafeArea={false}
        leftControls={{ mode: "back", onBack: () => router.back() }}
        rightAccessory={
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#111" />
            ) : (
              <Text style={st.saveBtn}>{locale === "zh" ? "保存" : "Save"}</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Plan Meta — collapsible */}
        <View style={st.metaSection}>
          <TextInput
            style={st.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={locale === "zh" ? "计划名称" : "Plan Title"}
            placeholderTextColor="#9CA3AF"
          />

          {metaOpen ? (
            <>
              {/* Weeks + Sess/Wk on same row */}
              <View style={st.metaRow}>
                <View style={st.metaItem}>
                  <Text style={st.metaLabel}>Weeks</Text>
                  <View style={st.stepper}>
                    <TouchableOpacity onPress={() => setWeeks(Math.max(1, weeks - 1))} style={st.stepBtn}>
                      <Ionicons name="remove" size={16} color="#111" />
                    </TouchableOpacity>
                    <Text style={st.stepValue}>{weeks}</Text>
                    <TouchableOpacity onPress={() => setWeeks(weeks + 1)} style={st.stepBtn}>
                      <Ionicons name="add" size={16} color="#111" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={st.metaItem}>
                  <Text style={st.metaLabel}>Sess/Wk</Text>
                  <View style={st.stepper}>
                    <TouchableOpacity onPress={() => setSessLow(Math.max(0, sessLow - 1))} style={st.stepBtn}>
                      <Ionicons name="remove" size={16} color="#111" />
                    </TouchableOpacity>
                    <Text style={st.stepValue}>{sessLow}~{sessLow + 1}</Text>
                    <TouchableOpacity onPress={() => setSessLow(Math.min(6, sessLow + 1))} style={st.stepBtn}>
                      <Ionicons name="add" size={16} color="#111" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Intensity picker */}
              <View style={st.intensityRow}>
                <Text style={st.metaLabel}>Intensity</Text>
                <View style={st.intensityOptions}>
                  {INTENSITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[st.intensityPill, intensity === opt && st.intensityPillActive]}
                      onPress={() => setIntensity(opt)}
                    >
                      <Text style={[st.intensityText, intensity === opt && st.intensityTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            /* Collapsed summary */
            <Text style={st.metaSummary}>
              {weeks}wk · {sessLow}~{sessLow + 1} sess/wk · {intensity}
            </Text>
          )}

          {/* Collapse / expand toggle */}
          <TouchableOpacity
            style={st.collapseBtn}
            onPress={() => setMetaOpen((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={metaOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

        {/* Week Selector with dots */}
        <WeekSelector
          totalWeeks={weeks}
          selectedWeek={selectedWeek}
          onSelectWeek={setSelectedWeek}
          sessionCounts={sessionCounts}
        />

        {/* Sessions for selected week */}
        <View style={st.sessionsContainer}>
          <Text style={st.weekTitle}>
            Week {selectedWeek} · {currentSessions.length} {currentSessions.length === 1 ? "session" : "sessions"}
          </Text>

          {currentSessions.map((session, i) => (
            <View key={session.session_id}>
              <SessionAccordion
                session={session}
                index={i}
                mode="builder"
                locale={locale}
                defaultOpen={i === 0}
                onExercisePress={(item) => handleExercisePress(i, item)}
                onExerciseRemove={(itemIdx) => removeItemFromSession(i, itemIdx)}
                onMoveExercise={(itemIdx, dir) => moveExerciseInSession(i, itemIdx, dir)}
                onAddExercise={() => handleOpenPicker(i)}
              />
              {currentSessions.length > 1 ? (
                <TouchableOpacity
                  style={st.deleteSessionBtn}
                  onPress={() => removeSession(i)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={st.deleteSessionText}>
                    {locale === "zh" ? "删除 Session" : "Remove Session"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {/* Add session */}
          <TouchableOpacity style={st.addSessionBtn} onPress={addSession} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={20} color="#4F46E5" />
            <Text style={st.addSessionText}>
              {locale === "zh" ? "新增 Session" : "Add Session"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        visible={pickerVisible}
        locale={locale}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickerSelect}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },

  saveBtn: { fontSize: 16, fontWeight: "700", color: "#4F46E5" },

  // Meta
  metaSection: { backgroundColor: "#FFF", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  titleInput: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 6,
  },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: { fontSize: 15, fontWeight: "700", color: "#111", minWidth: 34, textAlign: "center" },
  metaSummary: { fontSize: 13, fontWeight: "600", color: "#6B7280", paddingVertical: 2 },
  collapseBtn: {
    alignSelf: "flex-end",
    padding: 2,
    marginTop: -2,
  },

  intensityRow: { gap: 4 },
  intensityOptions: { flexDirection: "row", gap: 6 },
  intensityPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  intensityPillActive: { backgroundColor: "#111" },
  intensityText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  intensityTextActive: { color: "#FFF" },

  // Sessions
  sessionsContainer: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 12 },
  weekTitle: { fontSize: 16, fontWeight: "700", color: "#374151", marginBottom: 16 },

  deleteSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: -4,
    marginBottom: 12,
  },
  deleteSessionText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },

  addSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    borderStyle: "dashed",
  },
  addSessionText: { fontSize: 15, fontWeight: "600", color: "#4F46E5" },
});
