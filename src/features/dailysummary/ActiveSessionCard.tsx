// src/features/dailysummary/ActiveSessionCard.tsx
// Highlighted card shown at the top of today's daily summary when a session
// is in progress. Includes a live 1-second timer and an END SESSION button
// that calls useLogsStore.endSession().

import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import useLogsStore from "../../store/useLogsStore";

type Props = {
  startTime: number;
  /** Crag-level name for outdoor, gym name for indoor. Shown as small
   *  footer text — empty string is OK (footer hides). discipline is
   *  intentionally not displayed here (often mixed mid-session). */
  gymName: string;
};

function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function ActiveSessionCard({ startTime, gymName }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const endSession = useLogsStore((s) => s.endSession);
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const handleEnd = () => {
    Alert.alert(
      tr("结束 Session？", "End Session?"),
      tr("确认要结束当前的攀岩 session 吗？", "Are you sure you want to end this climbing session?"),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("结束", "End"),
          style: "default",
          onPress: async () => {
            try {
              await endSession();
            } catch (e) {
              console.warn("[ActiveSessionCard] endSession failed:", e);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.dot} />
        <Text style={styles.badge}>{tr("进行中", "ACTIVE")}</Text>
      </View>
      <Text style={styles.timer}>{formatElapsed(elapsed)}</Text>
      <TouchableOpacity style={styles.endBtn} onPress={handleEnd} activeOpacity={0.85}>
        <Text style={styles.endBtnText}>{tr("结束 Session", "END SESSION")}</Text>
      </TouchableOpacity>
      {/* Small footer: crag/gym name only — no discipline. Mid-session
          discipline is often mixed (TR warmup → lead project) and can
          mislead more than help. */}
      {gymName ? <Text style={styles.footer}>{gymName}</Text> : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor: colors.cardDark,
      borderRadius: 16,
      padding: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FF3B30",
    },
    badge: {
      fontSize: 11,
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
      letterSpacing: 1,
    },
    timer: {
      fontSize: 36,
      fontFamily: "DMMono_500Medium",
      color: "#FFFFFF",
      letterSpacing: 1,
    },
    footer: {
      marginTop: 12,
      fontSize: 11,
      fontFamily: theme.fonts.regular,
      color: "#8E8E93",
      letterSpacing: 0.2,
    },
    endBtn: {
      marginTop: 16,
      alignSelf: "flex-start",
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    endBtnText: {
      fontSize: 13,
      fontFamily: theme.fonts.bold,
      color: colors.cardDark,
      letterSpacing: 0.5,
    },
  });
