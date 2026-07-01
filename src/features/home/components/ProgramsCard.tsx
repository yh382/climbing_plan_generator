// Home "活动 / Programs" card — a teaser of gym-published comps + events +
// challenges; tap → the unified /programs list. (P2-H entry point.)
import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import React from "react";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { compApi } from "@/features/community/competitions/api";
import { eventApi } from "@/features/community/events/api";
import { challengeApi } from "@/features/community/challenges/api";

interface Row {
  kind: "comp" | "event" | "challenge";
  title: string;
}

const ICON = { comp: "trophy", event: "calendar", challenge: "flame" } as const;

export default function ProgramsCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const [rows, setRows] = useState<Row[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      Promise.allSettled([
        compApi.listAll(),
        eventApi.getEvents(),
        challengeApi.getChallenges({ limit: 20 }),
      ]).then(([c, e, ch]) => {
        if (!alive) return;
        const out: Row[] = [];
        if (c.status === "fulfilled") for (const x of c.value.items ?? []) out.push({ kind: "comp", title: x.title });
        if (e.status === "fulfilled") for (const x of e.value ?? []) out.push({ kind: "event", title: x.title });
        if (ch.status === "fulfilled") for (const x of ch.value ?? []) out.push({ kind: "challenge", title: x.title });
        setRows(out);
      });
      return () => { alive = false; };
    }, []),
  );

  if (rows.length === 0) return null;

  return (
    <Pressable style={styles.card} onPress={() => router.push("/programs" as any)}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{tr("活动", "Programs")}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{rows.length}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
      {rows.slice(0, 2).map((r, i) => (
        <View key={i} style={styles.row}>
          <Ionicons name={ICON[r.kind]} size={15} color={colors.accent} />
          <Text style={styles.rowText} numberOfLines={1}>{r.title}</Text>
        </View>
      ))}
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    label: { fontFamily: theme.fonts.black, fontSize: 16, color: colors.textPrimary, letterSpacing: -0.3 },
    countPill: { backgroundColor: colors.accent, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: "center" },
    countText: { fontFamily: theme.fonts.bold, fontSize: 12, color: "#FFFFFF" },
    row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
    rowText: { fontFamily: theme.fonts.medium, fontSize: 14, color: colors.textSecondary, flex: 1 },
  });
