// app/library/plan-builder.tsx

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { withHeaderTheme } from "../../src/lib/nativeHeaderOptions";
import { useSettings } from "../../src/contexts/SettingsContext";
import { plansApi } from "../../src/features/plans/api";
import { handleAwardedBadges } from "../../src/store/useBadgeUnlockStore";
import { SessionAccordion } from "../../src/features/plans/components/SessionAccordion";
import { WeekSelector } from "../../src/features/plans/components/WeekSelector";
import { ExercisePickerModal } from "../../src/features/plans/components/ExercisePickerModal";
import type { PlanV3, PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";
import type { ActionSummary } from "../../src/features/home/exercises/model/types";

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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Meta
  metaSection: { backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  titleInput: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 6,
  },
  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 17,
    fontWeight: "600",
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: "center" as const,
  },
  metaSummary: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, paddingVertical: 2 },
  collapseBtn: {
    alignSelf: "flex-end",
    padding: 2,
    marginTop: -2,
  },

  intensityRow: { gap: 4 },
  intensityOptions: { flexDirection: "row", gap: 6 },
  intensityPill: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  intensityPillActive: { backgroundColor: colors.pillBackground },
  intensityText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  intensityTextActive: { color: colors.pillText },

  // Sessions
  sessionsContainer: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 12 },
  weekTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },

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
    gap: 6,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
  },
  addSessionText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
});

export default function PlanBuilderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr, isZH } = useSettings();
  const locale = isZH ? "zh" : "en";

  const [title, setTitle] = useState(tr("我的自定义计划", "My Custom Plan"));
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

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Error", tr("请输入计划名称", "Please enter a plan title"));
      return;
    }

    // Gather all sessions across all weeks
    const allSessions = Object.values(weekSessions).flat();
    const totalExercises = allSessions.reduce(
      (sum, s) => sum + s.blocks.reduce((bs, b) => bs + b.items.length, 0),
      0
    );
    if (totalExercises === 0) {
      Alert.alert("Error", tr("请至少添加一个动作", "Please add at least one exercise"));
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

      const result = await plansApi.createPlan({
        title: title.trim(),
        plan_json: planJson as unknown as Record<string, unknown>,
        source: "custom",
        visibility: "private",
        training_type: intensity.toLowerCase(),
        duration_weeks: weeks,
      });
      handleAwardedBadges(result);

      Alert.alert(
        tr("成功", "Success"),
        tr("计划已保存", "Plan saved!"),
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  }, [title, weekSessions, sessLow, weeks, intensity, tr, router]);

  // --- Native header ---
  useLayoutEffect(() => {
    navigation.setOptions({
      ...withHeaderTheme(colors),
      title: tr("自定义计划", "Custom Plan"),
    });
  }, [navigation, colors, tr]);

  return (
    <View style={styles.container}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="checkmark"
          onPress={handleSave}
          disabled={saving}
        />
      </Stack.Toolbar>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Plan Meta — collapsible */}
        <View style={styles.metaSection}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={tr("计划名称", "Plan Title")}
            placeholderTextColor={colors.textTertiary}
          />

          {metaOpen ? (
            <>
              {/* Weeks + Sess/Wk on same row */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Weeks</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => setWeeks(Math.max(1, weeks - 1))} style={styles.stepBtn}>
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{weeks}</Text>
                    <TouchableOpacity onPress={() => setWeeks(weeks + 1)} style={styles.stepBtn}>
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Sess/Wk</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity onPress={() => setSessLow(Math.max(0, sessLow - 1))} style={styles.stepBtn}>
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepValue}>{sessLow}~{sessLow + 1}</Text>
                    <TouchableOpacity onPress={() => setSessLow(Math.min(6, sessLow + 1))} style={styles.stepBtn}>
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Intensity picker */}
              <View style={styles.intensityRow}>
                <Text style={styles.metaLabel}>Intensity</Text>
                <View style={styles.intensityOptions}>
                  {INTENSITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.intensityPill, intensity === opt && styles.intensityPillActive]}
                      onPress={() => setIntensity(opt)}
                    >
                      <Text style={[styles.intensityText, intensity === opt && styles.intensityTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          ) : (
            /* Collapsed summary */
            <Text style={styles.metaSummary}>
              {weeks}wk · {sessLow}~{sessLow + 1} sess/wk · {intensity}
            </Text>
          )}

          {/* Collapse / expand toggle */}
          <TouchableOpacity
            style={styles.collapseBtn}
            onPress={() => setMetaOpen((v) => !v)}
            hitSlop={8}
          >
            <Ionicons
              name={metaOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
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
        <View style={styles.sessionsContainer}>
          <Text style={styles.weekTitle}>
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
                  style={styles.deleteSessionBtn}
                  onPress={() => removeSession(i)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={styles.deleteSessionText}>
                    {tr("删除 Session", "Remove Session")}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {/* Add session */}
          <TouchableOpacity style={styles.addSessionBtn} onPress={addSession} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.addSessionText}>
              {tr("新增 Session", "Add Session")}
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
