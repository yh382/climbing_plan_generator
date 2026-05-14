// src/features/journal/MapSessionPill.tsx
// B2 #1: top-center "session active" pill for map screens (outdoor map +
// indoor floor plan). Shows red live-dot + h:mm:ss timer. Tapping opens
// daily-summary?date=today, where the user can end the session. Renders
// nothing when no active session exists.
//
// Palette is intentionally theme-agnostic (always-dark badge), matching
// ActiveSessionFloat's design — a Live-Activity-style indicator that
// stays high-contrast regardless of system theme. If a future theme
// refactor unifies these, lift PILL_COLORS out as shared tokens.

import React, { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import useLogsStore from "../../store/useLogsStore";
import { useSettings } from "../../contexts/SettingsContext";

const PILL_COLORS = {
  bgActive: "#0B1220",
  bgPaused: "#374151",
  dotActive: "#EF4444",
  dotPaused: "#FBBF24",
  timerActive: "#FFFFFF",
  timerPaused: "#D1D5DB",
  pausedLabel: "#FBBF24",
} as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatHMS(totalMs: number): string {
  const totalSec = Math.max(0, Math.floor(totalMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

type Props = {
  /** Override the safe-area top inset (e.g. when the parent already nudges
   *  the layout). Defaults to insets.top + 8. */
  topOffset?: number;
  /** Caller hook — fires before router.push to daily-summary so map screens
   *  can dismiss any open TrueSheet (primary list / detail / area info)
   *  before navigating, avoiding a half-open sheet on return. */
  onBeforeNavigate?: () => void;
};

export default function MapSessionPill({ topOffset, onBeforeNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tr } = useSettings();
  const activeSession = useLogsStore((s) => s.activeSession);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!activeSession) return;

    // Paused → freeze at activeDurationMinutes (no per-second tick).
    if (activeSession.pausedAt) {
      setElapsedMs(activeSession.activeDurationMinutes * 60 * 1000);
      return;
    }

    const update = () => setElapsedMs(Date.now() - activeSession.startTime);
    update();
    let id: ReturnType<typeof setInterval> | undefined = setInterval(update, 1000);

    // Stop ticking in the background to save battery (mirrors ActiveSessionFloat).
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        update();
        if (!id) id = setInterval(update, 1000);
      } else if (id) {
        clearInterval(id);
        id = undefined;
      }
    });

    return () => {
      if (id) clearInterval(id);
      sub.remove();
    };
  }, [activeSession]);

  if (!activeSession) return null;

  const isPaused = !!activeSession.pausedAt;
  const top = topOffset ?? insets.top + 8;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(40)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="box-none"
      style={[styles.container, { top }]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          onBeforeNavigate?.();
          router.push({ pathname: "/daily-summary", params: { date: "today" } } as any);
        }}
        style={[styles.pill, isPaused && styles.pillPaused]}
      >
        <View style={[styles.dot, isPaused && styles.dotPaused]} />
        <Text style={[styles.timer, isPaused && styles.timerPaused]}>
          {formatHMS(elapsedMs)}
        </Text>
        {isPaused && <Text style={styles.pausedLabel}>{tr("已暂停", "Paused")}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PILL_COLORS.bgActive,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pillPaused: {
    backgroundColor: PILL_COLORS.bgPaused,
    shadowOpacity: 0.05,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PILL_COLORS.dotActive,
  },
  dotPaused: {
    backgroundColor: PILL_COLORS.dotPaused,
  },
  timer: {
    color: PILL_COLORS.timerActive,
    fontWeight: "700",
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  timerPaused: {
    color: PILL_COLORS.timerPaused,
  },
  pausedLabel: {
    color: PILL_COLORS.pausedLabel,
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 2,
  },
});
