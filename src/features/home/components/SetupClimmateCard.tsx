import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import PressableScale from "@/components/ui/PressableScale";
import { useSetupChecklist, type SetupTask } from "../hooks/useSetupChecklist";
import PostGuideModal from "./PostGuideModal";

export default function SetupClimmateCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    visible,
    tasks,
    completedCount,
    totalCount,
    showGuideModal,
    setShowGuideModal,
  } = useSetupChecklist();

  if (!visible) return null;

  return (
    <>
      <View style={styles.container}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Setup Climmate</Text>
          <Text style={styles.counter}>
            {completedCount}/{totalCount}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedCount / totalCount) * 100}%` },
            ]}
          />
        </View>

        {/* Task list — hide completed tasks */}
        {tasks.filter((t) => !t.completed).map((task) => (
          <SetupTaskRow key={task.id} task={task} colors={colors} styles={styles} />
        ))}
      </View>

      {/* Post Guide Modal */}
      <PostGuideModal
        visible={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
}

function SetupTaskRow({ task, colors, styles }: { task: SetupTask; colors: ReturnType<typeof useThemeColors>; styles: any }) {
  return (
    <PressableScale
      onPress={task.locked ? undefined : task.onPress}
      disabled={task.locked}
      style={[styles.taskRow, task.locked && { opacity: 0.45 }]}
    >
      {/* Status icon */}
      <View
        style={[
          styles.statusCircle,
          !task.locked && styles.statusPending,
          task.locked && styles.statusLocked,
        ]}
      >
        {task.locked && (
          <Ionicons
            name="lock-closed"
            size={10}
            color={colors.textTertiary}
          />
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>
          {task.title}
        </Text>
        {task.locked && task.lockReason ? (
          <Text style={styles.lockReason}>{task.lockReason}</Text>
        ) : task.subtitle ? (
          <Text style={styles.taskSubtitle}>{task.subtitle}</Text>
        ) : null}
      </View>

      {/* Arrow */}
      {!task.locked && (
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.textTertiary}
        />
      )}
    </PressableScale>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  // DL v1 §2.1 — setup checklist is an actionable object card: white +
  // hairline (was a grey block).
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: theme.borderRadius.card,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...theme.shadow.card,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  counter: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: theme.fonts.monoMedium,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.progressTrack,
    marginHorizontal: 16,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  statusPending: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  statusLocked: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  taskSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lockReason: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
