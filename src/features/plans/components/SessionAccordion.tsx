// src/features/plans/components/SessionAccordion.tsx

import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "../../../lib/useThemeColors";
import { ExerciseItemCard, type ExerciseItemData, type ExerciseItemMode } from "../../../components/shared/ExerciseItemCard";
import type { PlanV3Session, PlanV3SessionItem } from "../../../types/plan";

interface Props {
  session: PlanV3Session;
  index: number;
  mode: ExerciseItemMode;
  locale: "zh" | "en";
  completedIds?: Set<string>;
  onExercisePress?: (item: PlanV3SessionItem) => void;
  onExerciseRemove?: (itemIndex: number) => void;
  onMoveExercise?: (itemIndex: number, direction: "up" | "down") => void;
  onAddExercise?: () => void;
  onStartSession?: () => void;
  defaultOpen?: boolean;
}

function sessionItemToCard(item: PlanV3SessionItem): ExerciseItemData {
  return {
    action_id: item.action_id,
    sets: item.sets,
    reps: item.reps,
    seconds: item.seconds,
    rest_sec: item.rest_sec,
    name_override: item.name_override,
    media: item.media,
    cues: item.cues,
  };
}

export function SessionAccordion({
  session,
  index,
  mode,
  locale,
  completedIds,
  onExercisePress,
  onExerciseRemove,
  onMoveExercise,
  onAddExercise,
  onStartSession,
  defaultOpen = false,
}: Props) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);

  const [open, setOpen] = useState(defaultOpen);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);

  const title = session.name || `Session ${index + 1}`;
  const sessionType = session.type === "climb" ? "Climbing" : "Training";
  const allItems = session.blocks.flatMap((b) => b.items);
  const exerciseCount = allItems.length;
  const completedCount = completedIds
    ? allItems.filter((it) => completedIds.has(it.action_id)).length
    : 0;

  const handleMenuAction = (action: "up" | "down" | "delete") => {
    if (menuIndex === null) return;
    const idx = menuIndex;
    setMenuIndex(null);
    if (action === "delete") {
      onExerciseRemove?.(idx);
    } else {
      onMoveExercise?.(idx, action);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={s.headerLeft}>
          <View style={{ flex: 1 }}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            <Text style={s.sub}>
              {sessionType}
              {session.intensity ? ` · ${session.intensity}` : ""}
              {session.est_duration_min ? ` · ${session.est_duration_min}m` : ""}
              {` · ${exerciseCount} ${exerciseCount === 1 ? "exercise" : "exercises"}`}
              {completedCount === exerciseCount && exerciseCount > 0 ? (
                <Text style={{ color: "#306E6F", fontWeight: "700" }}> · Completed</Text>
              ) : null}
            </Text>
          </View>
        </View>
        <View style={s.headerRight}>
          {mode === "execution" && exerciseCount > 0 ? (
            completedCount === exerciseCount ? (
              <Ionicons name="checkmark-circle" size={22} color="#306E6F" />
            ) : (
              <View style={s.progressPill}>
                <Text style={s.progressText}>{completedCount}/{exerciseCount}</Text>
              </View>
            )
          ) : null}
          <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={18} color="#9CA3AF" />
        </View>
      </TouchableOpacity>

      {/* Progress bar for execution mode */}
      {mode === "execution" && exerciseCount > 0 && completedCount < exerciseCount ? (
        <View style={s.progressBarContainer}>
          <View style={s.progressBarTrack}>
            <View style={[s.progressBarFill, { width: `${Math.round((completedCount / exerciseCount) * 100)}%` }]} />
          </View>
        </View>
      ) : null}

      {open ? (
        <View style={s.body}>
          {allItems.map((item, i) => (
            <View key={`${item.action_id}-${i}`}>
              <ExerciseItemCard
                item={sessionItemToCard(item)}
                mode={mode}
                locale={locale}
                completed={completedIds?.has(item.action_id)}
                onPress={() => onExercisePress?.(item)}
                onLongPress={mode === "builder" ? () => setMenuIndex(i) : undefined}
              />

              {/* Floating context menu */}
              {menuIndex === i && mode === "builder" ? (
                <>
                  {/* Dismiss overlay */}
                  <Pressable
                    style={s.menuOverlay}
                    onPress={() => setMenuIndex(null)}
                  />
                  <View style={s.menuContainer}>
                    {/* Move Up */}
                    <TouchableOpacity
                      style={s.menuItem}
                      disabled={i === 0}
                      onPress={() => handleMenuAction("up")}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-up" size={16} color={i === 0 ? "#D1D5DB" : "#374151"} />
                      <Text style={[s.menuText, i === 0 && s.menuTextDisabled]}>Move Up</Text>
                    </TouchableOpacity>

                    {/* Move Down */}
                    <TouchableOpacity
                      style={s.menuItem}
                      disabled={i === exerciseCount - 1}
                      onPress={() => handleMenuAction("down")}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-down" size={16} color={i === exerciseCount - 1 ? "#D1D5DB" : "#374151"} />
                      <Text style={[s.menuText, i === exerciseCount - 1 && s.menuTextDisabled]}>Move Down</Text>
                    </TouchableOpacity>

                    <View style={s.menuDivider} />

                    {/* Delete */}
                    <TouchableOpacity
                      style={s.menuItem}
                      onPress={() => handleMenuAction("delete")}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={s.menuTextDelete}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>
          ))}
          {mode === "builder" && onAddExercise ? (
            <TouchableOpacity style={s.addBtn} onPress={onAddExercise} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={s.addText}>
                {locale === "zh" ? "添加动作" : "Add Exercise"}
              </Text>
            </TouchableOpacity>
          ) : null}
          {mode === "execution" && onStartSession ? (
            <TouchableOpacity style={s.startSessionBtn} onPress={onStartSession} activeOpacity={0.8}>
              <Ionicons name="play-circle" size={18} color="#FFF" />
              <Text style={s.startSessionText}>
                {locale === "zh" ? "开始训练" : "Start Session"}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 72,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#111" },
  sub: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressPill: {
    backgroundColor: "rgba(48,110,111,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  progressText: { fontSize: 12, fontWeight: "700", color: "#306E6F" },
  progressBarContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  progressBarTrack: { height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#306E6F", borderRadius: 2 },

  body: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  addText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  startSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1C1C1E",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  startSessionText: { fontSize: 14, fontWeight: "700", color: "#FFF" },

  // Context menu
  menuOverlay: {
    position: "absolute",
    top: -200,
    left: -200,
    right: -200,
    bottom: -200,
    zIndex: 10,
  },
  menuContainer: {
    position: "absolute",
    right: 0,
    top: -4,
    width: 180,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  menuTextDisabled: { color: "#D1D5DB" },
  menuTextDelete: { fontSize: 14, fontWeight: "600", color: "#EF4444" },
  menuDivider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 14 },
});
