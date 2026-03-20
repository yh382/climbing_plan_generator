import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutDown } from "react-native-reanimated";

import useLogsStore from "../../store/useLogsStore";
import useActiveWorkoutStore from "../../store/useActiveWorkoutStore";

type Props = {
  style?: any;
  variant?: "floating" | "inline";
};

const PILL_H = 60;
const PILL_W = 72;
const RADIUS = 32;

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatSec(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s };
}

export default function ActiveSessionFloat({ style, variant = "floating" }: Props) {
  const router = useRouter();

  // Log session
  const { activeSession } = useLogsStore();
  const [elapsedMs, setElapsedMs] = useState(0);

  // Workout session
  const { isActive: workoutActive, isMinimized: workoutMinimized, seconds: workoutSeconds, sessionJson } = useActiveWorkoutStore();
  const showWorkout = workoutActive && workoutMinimized;

  useEffect(() => {
    if (!activeSession) return;
    const update = () => setElapsedMs(Date.now() - activeSession.startTime);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const hasLog = !!activeSession;
  const hasWorkout = showWorkout;

  if (!hasLog && !hasWorkout) return null;

  // Log timer values
  const logSec = Math.floor(elapsedMs / 1000);
  const logTime = formatSec(logSec);
  const logTopText = logTime.h >= 1 ? pad2(logTime.h) : pad2(logTime.m);
  const logBottomText = logTime.h >= 1 ? pad2(logTime.m) : pad2(logTime.s);

  // Workout timer values
  const wTime = formatSec(workoutSeconds);
  const wTopText = wTime.h >= 1 ? pad2(wTime.h) : pad2(wTime.m);
  const wBottomText = wTime.h >= 1 ? pad2(wTime.m) : pad2(wTime.s);

  const handleLogPress = () => router.push("/journal");
  const handleWorkoutPress = () => {
    if (sessionJson) {
      router.push({ pathname: "/library/plan-view", params: { sessionJson } } as any);
    }
  };

  // Inline variant (unchanged logic, only log)
  if (variant === "inline") {
    if (!hasLog) return null;
    return (
      <TouchableOpacity style={[styles.inlineContainer, style]} onPress={handleLogPress} activeOpacity={0.8}>
        <View style={styles.liveDot} />
        <Text style={styles.inlineText}>{`${pad2(logTime.h)}:${pad2(logTime.m)}:${pad2(logTime.s)}`}</Text>
        <Ionicons name="chevron-forward" size={14} color="#FFF" style={{ opacity: 0.6, marginLeft: 4 }} />
      </TouchableOpacity>
    );
  }

  // Floating variant: side-by-side pills
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(40)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.floatingRow, style]}
    >
      {/* Workout pill */}
      {hasWorkout ? (
        <TouchableOpacity style={styles.pill} onPress={handleWorkoutPress} activeOpacity={0.9}>
          <Ionicons name="body-outline" size={14} color="#60A5FA" />
          <View style={styles.twoLineCol}>
            <Text style={styles.timeTop}>{wTopText}</Text>
            <Text style={styles.timeBottom}>{wBottomText}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Log pill */}
      {hasLog ? (
        <TouchableOpacity style={styles.pill} onPress={handleLogPress} activeOpacity={0.9}>
          <View style={styles.liveDot} />
          <View style={styles.twoLineCol}>
            <Text style={styles.timeTop}>{logTopText}</Text>
            <Text style={styles.timeBottom}>{logBottomText}</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /* Inline */
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1220",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#3B82F6",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  inlineText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },

  /* Floating row container */
  floatingRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },

  /* Individual pill */
  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: RADIUS,
    backgroundColor: "#0F172A",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 5,
  },

  twoLineCol: {
    alignItems: "center",
    justifyContent: "center",
  },
  timeTop: {
    color: "#F9FAFB",
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 12,
    fontVariant: ["tabular-nums"],
  },
  timeBottom: {
    color: "#E5E7EB",
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 12,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },

  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EF4444",
  },
});
