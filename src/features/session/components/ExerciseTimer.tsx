// src/features/session/components/ExerciseTimer.tsx
//
// TR5 V2 — Hevy/Crimpd hybrid rewrite of the per-exercise timer.
//
// State machine: IDLE → WORK → REST → REST_READY → WORK → … → COMPLETE
//
// Key behavior changes vs V1:
//   - PREPARE 3s countdown removed (tap Start = WORK now).
//   - Rest is *manual-advance* by default (Hevy/Strong pattern): when REST
//     hits 0 we enter REST_READY + haptic, but the user must tap
//     "Start Next Set" to leave it. Avoids the "being pushed" feel of V1's
//     auto-flip.
//   - `intervalMode` opt-in (Crimpd hangboard repeater pattern): REST hits 0
//     auto-flips back to WORK with no manual gate. Caller decides per
//     exercise (Phase 3 will add `Exercise.interval_mode` flag in BE; for
//     MVP the caller can hard-wire by action_id / tag).
//   - REST_REP intermediate state removed — rep is incremented when WORK
//     finishes without leaving WORK. Per-rep micro-rest fits "interval"
//     better than "manual strength" so we treat it under intervalMode.
//   - Warm-up vs working set toggle at the top: warm-up halves the rest
//     window so a warm-up set doesn't burn 3 minutes of rest.
//   - Manual overrides on the rest screen: skip, ±15s.
//   - Theme-aware StyleSheet (createStyles(colors)) to fix V1's hardcoded
//     greys breaking dark mode.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { theme } from "../../../lib/theme";
import { useThemeColors } from "../../../lib/useThemeColors";

// ── Types ──────────────────────────────────────────────────────────────

export type TimerPhase = "IDLE" | "WORK" | "REST" | "REST_READY" | "COMPLETE";
export type SetMode = "warmup" | "working";

interface Props {
  /** Total sets for this exercise (≥1). */
  sets: number;
  /** Reps per set. 0/1 = no rep counter (pure time). */
  reps: number;
  /** Work duration per rep, in seconds. 0 = count mode (user taps Done Set). */
  seconds: number;
  /** Base rest between sets, in seconds. Warm-up mode halves it. */
  restSec: number;
  /** Hangboard/interval-style auto-advance from REST to next WORK. */
  intervalMode?: boolean;
  /** Per-set completion side-effect (e.g. badge progress). */
  onSetComplete?: (setNum: number) => void;
  /** Fires when the last set's REST_READY is dismissed (or auto on COMPLETE). */
  onAllComplete?: () => void;
  /** Mirror legacy V1 prop so existing call sites keep working. Internal
   *  copy uses a local `t(zh, en)` helper, no useSettings dependency. */
  isZH: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export default function ExerciseTimer({
  sets = 1,
  reps = 1,
  seconds = 0,
  restSec = 60,
  intervalMode = false,
  onSetComplete,
  onAllComplete,
  isZH,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useCallback((zh: string, en: string) => (isZH ? zh : en), [isZH]);

  // Locked at component mount — caller can re-mount to switch. Rep counter
  // only renders if there's more than one rep.
  const isTimedMode = seconds > 0;
  const hasReps = reps > 1;

  const [phase, setPhase] = useState<TimerPhase>("IDLE");
  const [setMode, setSetMode] = useState<SetMode>("working");
  const [timeLeft, setTimeLeft] = useState(0);
  /** Count up while WORK runs in count mode (no fixed work duration). */
  const [elapsed, setElapsed] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Stable refs for use inside the tick interval (avoid React 18 strict-
  // mode double-firing tied to closure captures).
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const haptic = useCallback(
    (kind: "tap" | "ready" | "done" = "tap") => {
      if (Platform.OS === "web") return;
      const map = {
        tap: Haptics.ImpactFeedbackStyle.Medium,
        ready: Haptics.NotificationFeedbackType.Success,
        done: Haptics.NotificationFeedbackType.Success,
      } as const;
      if (kind === "tap") {
        Haptics.impactAsync(map.tap);
      } else {
        Haptics.notificationAsync(map[kind]);
      }
    },
    [],
  );

  // Warm-up halves the configured rest. Working uses it as-is.
  const restForCurrentMode = useCallback(
    () => Math.max(0, Math.round(restSec * (setMode === "warmup" ? 0.5 : 1))),
    [restSec, setMode],
  );

  // ── Transitions ───────────────────────────────────────────────────────

  /** WORK finished — either fixed time elapsed OR user tapped Done Set in
   *  count mode. Advance rep / set / state. Defensively gated on phase
   *  because we may be invoked via `queueMicrotask` after a tick during
   *  strict-mode double-invocation; re-entry from a non-WORK state would
   *  fire haptics + onSetComplete twice. */
  const completeWorkInterval = useCallback(() => {
    if (phaseRef.current !== "WORK") return;
    haptic("done");
    if (hasReps && currentRep < reps) {
      // Multi-rep: roll forward without leaving WORK. Per-rep micro-rest
      // is left to intervalMode workouts (already short by design).
      setCurrentRep((r) => r + 1);
      if (isTimedMode) setTimeLeft(seconds);
      else setElapsed(0);
      return;
    }
    // Last rep of the set is done.
    onSetComplete?.(currentSet);
    if (currentSet >= sets) {
      // Final set — done.
      setPhase("COMPLETE");
      setTimeLeft(0);
      onAllComplete?.();
      return;
    }
    // Enter REST.
    setPhase("REST");
    setTimeLeft(restForCurrentMode());
  }, [
    haptic,
    hasReps,
    currentRep,
    reps,
    isTimedMode,
    seconds,
    onSetComplete,
    currentSet,
    sets,
    onAllComplete,
    restForCurrentMode,
  ]);

  /** REST window hit zero. Same defensive phase guard as
   *  `completeWorkInterval` — protect against strict-mode double-invocation
   *  of the tick updater queuing this microtask twice. */
  const handleRestExpiry = useCallback(() => {
    if (phaseRef.current !== "REST") return;
    if (intervalMode) {
      // Hangboard / interval style — flip straight back to WORK.
      haptic("done");
      setCurrentSet((s) => s + 1);
      setCurrentRep(1);
      setPhase("WORK");
      if (isTimedMode) setTimeLeft(seconds);
      else setElapsed(0);
      return;
    }
    // Manual mode — sit in READY waiting for user.
    haptic("ready");
    setPhase("REST_READY");
    setTimeLeft(0);
  }, [intervalMode, haptic, isTimedMode, seconds]);

  // ── Tick ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      phase === "IDLE"
      || phase === "COMPLETE"
      || phase === "REST_READY"
      || isPaused
    ) return;

    const interval = setInterval(() => {
      const p = phaseRef.current;
      if (p === "WORK" && !isTimedMode) {
        // Count up — user taps Done Set to end.
        setElapsed((e) => e + 1);
        return;
      }
      if (p === "WORK" && isTimedMode) {
        setTimeLeft((tl) => {
          if (tl <= 1) {
            // Defer phase transition to the next tick — avoids running
            // setState side effects inside another setState updater.
            queueMicrotask(completeWorkInterval);
            return 0;
          }
          return tl - 1;
        });
        return;
      }
      if (p === "REST") {
        setTimeLeft((tl) => {
          if (tl <= 1) {
            queueMicrotask(handleRestExpiry);
            return 0;
          }
          return tl - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isPaused, isTimedMode, completeWorkInterval, handleRestExpiry]);

  // ── User actions ──────────────────────────────────────────────────────

  const startWorkout = () => {
    haptic("tap");
    setCurrentSet(1);
    setCurrentRep(1);
    setIsPaused(false);
    setElapsed(0);
    setTimeLeft(isTimedMode ? seconds : 0);
    setPhase("WORK");
  };

  const tapDoneSet = () => {
    if (phase !== "WORK") return;
    haptic("tap");
    completeWorkInterval();
  };

  const tapStartNextSet = () => {
    if (phase !== "REST_READY") return;
    haptic("tap");
    setCurrentSet((s) => s + 1);
    setCurrentRep(1);
    setPhase("WORK");
    if (isTimedMode) setTimeLeft(seconds);
    else setElapsed(0);
  };

  const tapSkipRest = () => {
    if (phase !== "REST") return;
    haptic("tap");
    handleRestExpiry();
  };

  const adjustRest = (deltaSec: number) => {
    if (phase !== "REST") return;
    haptic("tap");
    setTimeLeft((tl) => Math.max(0, tl + deltaSec));
  };

  const togglePause = () => {
    if (phase === "IDLE" || phase === "COMPLETE" || phase === "REST_READY") return;
    haptic("tap");
    setIsPaused((p) => !p);
  };

  const endExercise = () => {
    haptic("done");
    setPhase("COMPLETE");
    setTimeLeft(0);
    onAllComplete?.();
  };

  const restart = () => {
    setPhase("IDLE");
    setTimeLeft(0);
    setElapsed(0);
    setCurrentSet(1);
    setCurrentRep(1);
    setIsPaused(false);
  };

  // ── Display ───────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const sign = s < 0 ? "-" : "";
    const abs = Math.abs(s);
    const min = Math.floor(abs / 60).toString().padStart(2, "0");
    const sec = (abs % 60).toString().padStart(2, "0");
    return `${sign}${min}:${sec}`;
  };

  const displayTime =
    phase === "WORK" && !isTimedMode
      ? formatTime(elapsed)
      : phase === "IDLE"
        ? formatTime(isTimedMode ? seconds : 0)
        : formatTime(timeLeft);

  const phaseLabel = (() => {
    switch (phase) {
      case "IDLE":       return t("准备开始", "Ready");
      case "WORK":       return t("发力", "WORK");
      case "REST":       return t("休息", "REST");
      case "REST_READY": return t("下一组准备就绪", "Next set ready");
      case "COMPLETE":   return t("完成", "DONE");
      default:           return "";
    }
  })();

  const phaseAccent =
    phase === "WORK"       ? colors.textPrimary
    : phase === "COMPLETE" ? colors.accent
    : colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Warm-up / working toggle (locked in IDLE) */}
      <View style={styles.modeRow}>
        {(["warmup", "working"] as SetMode[]).map((m) => {
          const active = setMode === m;
          const disabled = phase !== "IDLE";
          return (
            <TouchableOpacity
              key={m}
              onPress={() => !disabled && setSetMode(m)}
              style={[
                styles.modePill,
                active
                  ? { backgroundColor: colors.cardDark, borderColor: colors.cardDark }
                  : { borderColor: colors.border },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              accessibilityLabel={
                m === "warmup" ? t("热身组", "Warm-up set") : t("正式组", "Working set")
              }
              disabled={disabled}
            >
              <Text
                style={[
                  styles.modePillText,
                  { color: active ? "#FFF" : colors.textPrimary, opacity: disabled ? 0.5 : 1 },
                ]}
              >
                {m === "warmup" ? t("热身", "Warm-up") : t("正式", "Working")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Phase label */}
      <Text style={[styles.phaseLabel, { color: phaseAccent }]}>{phaseLabel}</Text>

      {/* Big timer */}
      <Text style={styles.timerDisplay}>{displayTime}</Text>

      {/* Set / rep progress */}
      <View style={styles.progressRow}>
        <ProgressCell
          label={t("组", "SET")}
          current={currentSet}
          total={sets}
          styles={styles}
        />
        {hasReps ? (
          <ProgressCell
            label={t("次", "REP")}
            current={currentRep}
            total={reps}
            styles={styles}
          />
        ) : null}
      </View>

      {/* Controls */}
      {phase === "IDLE" || phase === "COMPLETE" ? (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={phase === "COMPLETE" ? restart : startWorkout}
          accessibilityRole="button"
          accessibilityLabel={phase === "COMPLETE" ? t("重来", "Restart") : t("开始", "Start")}
        >
          <Ionicons name="play" size={22} color="#FFF" />
          <Text style={styles.primaryBtnText}>
            {phase === "COMPLETE" ? t("重来", "Restart") : t("开始", "Start")}
          </Text>
        </TouchableOpacity>
      ) : phase === "WORK" ? (
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={tapDoneSet}
            accessibilityRole="button"
            accessibilityLabel={t("完成本组", "Done set")}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
            <Text style={styles.primaryBtnText}>{t("完成本组", "Done Set")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={togglePause}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? t("继续", "Resume") : t("暂停", "Pause")}
          >
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      ) : phase === "REST" ? (
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => adjustRest(-15)}
            accessibilityRole="button"
            accessibilityLabel={t("减 15 秒", "Subtract 15 seconds")}
          >
            <Text style={[styles.iconBtnText, { color: colors.textPrimary }]}>-15s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={tapSkipRest}
            accessibilityRole="button"
            accessibilityLabel={t("跳过休息", "Skip rest")}
          >
            <Ionicons name="play-skip-forward" size={20} color="#FFF" />
            <Text style={styles.primaryBtnText}>{t("跳过休息", "Skip Rest")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => adjustRest(15)}
            accessibilityRole="button"
            accessibilityLabel={t("加 15 秒", "Add 15 seconds")}
          >
            <Text style={[styles.iconBtnText, { color: colors.textPrimary }]}>+15s</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // REST_READY
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={tapStartNextSet}
          accessibilityRole="button"
          accessibilityLabel={t("开始下一组", "Start next set")}
        >
          <Ionicons name="play" size={22} color="#FFF" />
          <Text style={styles.primaryBtnText}>{t("开始下一组", "Start Next Set")}</Text>
        </TouchableOpacity>
      )}

      {/* Secondary actions — end the exercise mid-way without going through
          all sets. Hidden in IDLE / COMPLETE; small text-only affordance. */}
      {phase !== "IDLE" && phase !== "COMPLETE" ? (
        <TouchableOpacity
          style={styles.endRow}
          onPress={endExercise}
          accessibilityRole="button"
          accessibilityLabel={t("结束训练", "End exercise")}
        >
          <Text style={[styles.endText, { color: colors.textTertiary }]}>
            {t("结束训练", "End Exercise")}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function ProgressCell({
  label,
  current,
  total,
  styles,
}: {
  label: string;
  current: number;
  total: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.progressItem}>
      <Text style={styles.progressLabel}>{label}</Text>
      <Text style={styles.progressValue}>
        {current}
        <Text style={styles.progressTotal}>/{total}</Text>
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
    },
    modeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
    },
    modePill: {
      borderWidth: 1,
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    modePillText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      fontWeight: "700",
    },
    phaseLabel: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    timerDisplay: {
      fontSize: 64,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
      lineHeight: 76,
      marginBottom: 12,
    },
    progressRow: {
      flexDirection: "row",
      gap: 32,
      marginBottom: 20,
    },
    progressItem: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
    },
    progressLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      fontFamily: theme.fonts.bold,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    progressValue: {
      fontSize: 28,
      color: colors.textPrimary,
      fontFamily: theme.fonts.monoMedium,
    },
    progressTotal: {
      fontSize: 18,
      color: colors.textTertiary,
      fontFamily: theme.fonts.monoMedium,
    },
    controlsRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.cardDark,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.pill,
    },
    primaryBtnText: {
      color: "#FFF",
      fontFamily: theme.fonts.bold,
      fontWeight: "800",
      fontSize: 16,
    },
    iconBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconBtnText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      fontWeight: "700",
    },
    endRow: {
      marginTop: 16,
      paddingVertical: 4,
    },
    endText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      letterSpacing: 0.4,
    },
  });
