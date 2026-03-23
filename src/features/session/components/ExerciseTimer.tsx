// src/features/session/components/ExerciseTimer.tsx

import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

type TimerPhase = "IDLE" | "PREPARE" | "WORK" | "REST_REP" | "REST_SET" | "COMPLETE";

interface Props {
  sets: number;
  reps: number;
  seconds: number;       // work duration per rep (0 = count mode)
  restSec: number;       // rest between sets
  onSetComplete?: (setNum: number) => void;
  onAllComplete?: () => void;
  isZH: boolean;
}

export default function ExerciseTimer({
  sets = 1,
  reps = 1,
  seconds = 0,
  restSec = 60,
  onSetComplete,
  onAllComplete,
  isZH,
}: Props) {
  const [phase, setPhase] = useState<TimerPhase>("IDLE");
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0); // for count mode
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const isTimedMode = seconds > 0;
  const restRepDuration = reps > 1 ? 3 : 0;
  const restSetDuration = restSec || 60;

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentSetRef = useRef(currentSet);
  currentSetRef.current = currentSet;
  const currentRepRef = useRef(currentRep);
  currentRepRef.current = currentRep;

  const hapticFeedback = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  // Phase transition logic
  const handlePhaseTransition = useCallback(() => {
    const p = phaseRef.current;
    const cSet = currentSetRef.current;
    const cRep = currentRepRef.current;

    switch (p) {
      case "PREPARE":
        setPhase("WORK");
        if (isTimedMode) setTimeLeft(seconds);
        else setElapsed(0);
        break;

      case "WORK":
        hapticFeedback();
        if (cRep < reps && restRepDuration > 0) {
          setPhase("REST_REP");
          setTimeLeft(restRepDuration);
        } else if (cRep < reps) {
          setCurrentRep(r => r + 1);
          if (isTimedMode) setTimeLeft(seconds);
          else setElapsed(0);
        } else if (cSet < sets) {
          onSetComplete?.(cSet);
          setPhase("REST_SET");
          setTimeLeft(restSetDuration);
        } else {
          onSetComplete?.(cSet);
          setPhase("COMPLETE");
          setTimeLeft(0);
          onAllComplete?.();
        }
        break;

      case "REST_REP":
        setCurrentRep(r => r + 1);
        setPhase("WORK");
        if (isTimedMode) setTimeLeft(seconds);
        else setElapsed(0);
        break;

      case "REST_SET":
        hapticFeedback();
        setCurrentSet(s => s + 1);
        setCurrentRep(1);
        setPhase("WORK");
        if (isTimedMode) setTimeLeft(seconds);
        else setElapsed(0);
        break;
    }
  }, [isTimedMode, seconds, reps, sets, restRepDuration, restSetDuration, hapticFeedback, onSetComplete, onAllComplete]);

  // Timer tick
  useEffect(() => {
    if (phase === "IDLE" || phase === "COMPLETE" || isPaused) return;

    const interval = setInterval(() => {
      if (phase === "WORK" && !isTimedMode) {
        setElapsed(prev => prev + 1);
      } else {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handlePhaseTransition();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isPaused, isTimedMode, handlePhaseTransition]);

  const start = () => {
    if (phase === "IDLE" || phase === "COMPLETE") {
      setCurrentSet(1);
      setCurrentRep(1);
      setPhase("PREPARE");
      setTimeLeft(3);
      setElapsed(0);
      setIsPaused(false);
    } else {
      setIsPaused(false);
    }
  };

  const pause = () => setIsPaused(true);

  const skip = () => {
    if (phase === "REST_REP" || phase === "REST_SET" || phase === "PREPARE") {
      handlePhaseTransition();
    }
  };

  const completeCurrentSet = () => {
    if (phase !== "WORK" || isTimedMode) return;
    handlePhaseTransition();
  };

  const reset = () => {
    setPhase("IDLE");
    setTimeLeft(0);
    setElapsed(0);
    setCurrentSet(1);
    setCurrentRep(1);
    setIsPaused(false);
  };

  // --- Navigation helpers ---
  const jumpTo = (newSet: number, newRep: number) => {
    setCurrentSet(newSet);
    setCurrentRep(newRep);
    setPhase("WORK");
    setIsPaused(true);
    if (isTimedMode) setTimeLeft(seconds);
    else setElapsed(0);
    hapticFeedback();
  };

  const prevSet = () => {
    if (currentSet > 1) jumpTo(currentSet - 1, 1);
  };
  const nextSet = () => {
    if (currentSet < sets) jumpTo(currentSet + 1, 1);
  };
  const prevRep = () => {
    if (currentRep > 1) jumpTo(currentSet, currentRep - 1);
  };
  const nextRep = () => {
    if (currentRep < reps) jumpTo(currentSet, currentRep + 1);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${min}:${sec}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case "PREPARE": return "#888888";
      case "WORK": return "#1C1C1E";
      case "REST_REP": return "#888888";
      case "REST_SET": return "#888888";
      case "COMPLETE": return "#306E6F";
      default: return "#BBBBBB";
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "IDLE": return isZH ? "准备开始" : "Ready";
      case "PREPARE": return isZH ? "准备!" : "Get Ready!";
      case "WORK": return isZH ? "发力!" : "WORK!";
      case "REST_REP": return isZH ? "小休" : "Rest (Rep)";
      case "REST_SET": return isZH ? "组间休息" : "Set Rest";
      case "COMPLETE": return isZH ? "完成!" : "Done!";
      default: return "";
    }
  };

  const displayTime = phase === "WORK" && !isTimedMode
    ? formatTime(elapsed)
    : formatTime(phase === "IDLE" ? seconds : timeLeft);

  const isActive = phase !== "IDLE" && phase !== "COMPLETE";

  return (
    <View style={styles.container}>
      {/* Phase label */}
      <Text style={[styles.phaseLabel, { color: getPhaseColor() }]}>
        {getPhaseLabel()}
      </Text>

      {/* Timer display (large) */}
      <Text style={styles.timerDisplay}>{displayTime}</Text>

      {/* Set/Rep progress (large) */}
      <View style={styles.progressRow}>
        <View style={styles.progressItem}>
          <Text style={styles.progressLabel}>SET</Text>
          <Text style={styles.progressValue}>
            {currentSet}<Text style={styles.progressTotal}>/{sets}</Text>
          </Text>
        </View>
        {reps > 1 && (
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>REP</Text>
            <Text style={styles.progressValue}>
              {currentRep}<Text style={styles.progressTotal}>/{reps}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Main control */}
      <View style={styles.controls}>
        {phase === "IDLE" || phase === "COMPLETE" ? (
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: "#1C1C1E" }]} onPress={start}>
            <Ionicons name="play" size={28} color="#FFF" />
            <Text style={styles.mainBtnText}>
              {phase === "COMPLETE" ? (isZH ? "重来" : "Restart") : (isZH ? "开始" : "Start")}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: isPaused ? "#1C1C1E" : "#1C1C1E" }]}
              onPress={isPaused ? start : pause}
            >
              <Ionicons name={isPaused ? "play" : "pause"} size={24} color="#FFF" />
            </TouchableOpacity>

            {(phase === "REST_REP" || phase === "REST_SET" || phase === "PREPARE") && (
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: "#888888" }]} onPress={skip}>
                <Ionicons name="play-skip-forward" size={22} color="#FFF" />
              </TouchableOpacity>
            )}

            {phase === "WORK" && !isTimedMode && (
              <TouchableOpacity style={styles.completeSetBtn} onPress={completeCurrentSet}>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                <Text style={styles.completeSetText}>
                  {isZH ? "完成本组" : "Complete Set"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: "#F7F7F7" }]} onPress={reset}>
              <Ionicons name="refresh" size={22} color="#888888" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Navigation row: prev set / prev rep / next rep / next set */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[styles.navBtn, currentSet <= 1 && styles.navBtnDisabled]}
            onPress={prevSet}
            disabled={currentSet <= 1}
          >
            <Ionicons name="play-back" size={14} color={currentSet <= 1 ? "#D1D5DB" : "#374151"} />
            <Text style={[styles.navText, currentSet <= 1 && styles.navTextDisabled]}>
              {isZH ? "上一组" : "Prev Set"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, currentRep <= 1 && styles.navBtnDisabled]}
            onPress={prevRep}
            disabled={currentRep <= 1}
          >
            <Ionicons name="caret-back" size={14} color={currentRep <= 1 ? "#D1D5DB" : "#374151"} />
            <Text style={[styles.navText, currentRep <= 1 && styles.navTextDisabled]}>
              {isZH ? "上一次" : "Prev Rep"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, currentRep >= reps && styles.navBtnDisabled]}
            onPress={nextRep}
            disabled={currentRep >= reps}
          >
            <Text style={[styles.navText, currentRep >= reps && styles.navTextDisabled]}>
              {isZH ? "下一次" : "Next Rep"}
            </Text>
            <Ionicons name="caret-forward" size={14} color={currentRep >= reps ? "#D1D5DB" : "#374151"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navBtn, currentSet >= sets && styles.navBtnDisabled]}
            onPress={nextSet}
            disabled={currentSet >= sets}
          >
            <Text style={[styles.navText, currentSet >= sets && styles.navTextDisabled]}>
              {isZH ? "下一组" : "Next Set"}
            </Text>
            <Ionicons name="play-forward" size={14} color={currentSet >= sets ? "#D1D5DB" : "#374151"} />
          </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    borderWidth: 0,
    padding: 24,
    alignItems: "center",
  },
  phaseLabel: {
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  timerDisplay: {
    fontSize: 64,
    fontFamily: "DMSans_900Black",
    color: "#000000",
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
    color: "#888888",
    fontFamily: "DMSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  progressValue: {
    fontSize: 28,
    color: "#000000",
    fontFamily: "DMMono_500Medium",
  },
  progressTotal: {
    fontSize: 18,
    color: "#BBBBBB",
    fontFamily: "DMMono_400Regular",
  },
  controls: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  mainBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
  },
  mainBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
  },
  controlBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  completeSetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 25,
  },
  completeSetText: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
  },
  // Navigation row
  navRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navText: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: "#000000",
  },
  navTextDisabled: {
    color: "#BBBBBB",
  },
});
