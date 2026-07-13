// Home "活动 / Programs" card — an Apple-widget-style teaser: the 3 newest
// gym-published programs (comps + events + challenges) laid out side by side,
// each with its cover, host gym avatar and dates. Tap a tile → its detail; tap
// the header → the unified /programs list. (P2-H entry point.)
import { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import PressableScale from "@/components/ui/PressableScale";
import { Image } from "expo-image";
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

type Kind = "comp" | "event" | "challenge";
interface Item {
  kind: Kind;
  id: string;
  title: string;
  hostLogo: string | null;
  cover: string | null;
  dateLabel: string | null;
  ts: number;
}

const TINT: Record<Kind, string> = { comp: "#B5834F", event: "#2E6F8E", challenge: "#C27C40" };
const ICON = { comp: "trophy", event: "calendar", challenge: "flame" } as const;

function md(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function dateRange(start?: string | null, end?: string | null): string | null {
  const s = md(start);
  const e = md(end);
  if (s && e && s !== e) return `${s} – ${e}`;
  return s;
}
function compStatus(status: string, tr: (zh: string, en: string) => string): string {
  return status === "active"
    ? tr("进行中", "Live")
    : status === "finished"
      ? tr("已结束", "Ended")
      : tr("报名中", "Open");
}

export default function ProgramsCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const [items, setItems] = useState<Item[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;
      Promise.allSettled([
        compApi.listAll(),
        eventApi.getEvents(),
        challengeApi.getChallenges({ limit: 20 }),
      ]).then(([c, e, ch]) => {
        if (!alive) return;
        const out: Item[] = [];
        if (c.status === "fulfilled")
          for (const x of c.value.items ?? [])
            out.push({
              kind: "comp",
              id: x.id,
              title: x.title,
              hostLogo: x.organizer?.logo_url ?? null,
              cover: null,
              dateLabel: dateRange(x.start_at, x.end_at) ?? compStatus(x.status, tr),
              ts: x.start_at ? new Date(x.start_at).getTime() || 0 : 0,
            });
        if (e.status === "fulfilled")
          for (const x of e.value ?? [])
            out.push({
              kind: "event",
              id: x.id,
              title: x.title,
              hostLogo: x.publisher?.logoUrl ?? null,
              cover: x.cover_url ?? null,
              dateLabel: dateRange(x.start_at, x.end_at),
              ts: x.start_at ? new Date(x.start_at).getTime() || 0 : 0,
            });
        if (ch.status === "fulfilled")
          for (const x of ch.value ?? [])
            out.push({
              kind: "challenge",
              id: x.id,
              title: x.title,
              hostLogo: null,
              cover: x.coverUrl ?? null,
              dateLabel: dateRange(x.startAt, x.endAt),
              ts: x.startAt ? new Date(x.startAt).getTime() || 0 : 0,
            });
        out.sort((a, b) => b.ts - a.ts);
        setItems(out);
      });
      return () => {
        alive = false;
      };
    }, [tr]),
  );

  if (items.length === 0) return null;

  function open(it: Item) {
    if (it.kind === "comp") router.push(`/competition/${it.id}` as any);
    else if (it.kind === "event")
      router.push({ pathname: "/community/events/[eventId]", params: { eventId: it.id } } as any);
    else
      router.push({ pathname: "/community/challenges/[challengeId]", params: { challengeId: it.id } } as any);
  }

  const top = items.slice(0, 3);

  // DL v1 §3 — the section shell card is gone; the program tiles themselves
  // are the object cards. Header = micro label + accent action.
  return (
    <View style={styles.section}>
      <PressableScale style={styles.headerRow} onPress={() => router.push("/programs" as any)}>
        <Text style={styles.label}>{tr("活动", "Programs")}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.seeAll}>{tr("全部", "All")}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
      </PressableScale>

      <View style={styles.row}>
        {top.map((it) => (
          <PressableScale key={`${it.kind}-${it.id}`} style={styles.cell} onPress={() => open(it)}>
            <View style={styles.coverWrap}>
              {it.cover ? (
                <Image source={{ uri: it.cover }} style={styles.cover} contentFit="cover" />
              ) : (
                <View style={[styles.cover, styles.coverPh, { backgroundColor: TINT[it.kind] }]}>
                  <Ionicons name={ICON[it.kind]} size={22} color="rgba(255,255,255,0.9)" />
                </View>
              )}
              <View style={styles.hostAvatar}>
                {it.hostLogo ? (
                  <Image source={{ uri: it.hostLogo }} style={styles.hostAvatarImg} contentFit="cover" />
                ) : (
                  <View style={[styles.hostAvatarImg, styles.hostAvatarPh]}>
                    <Ionicons name={ICON[it.kind]} size={9} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.cellTitle} numberOfLines={2}>{it.title}</Text>
            {it.dateLabel ? (
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={10} color={colors.textTertiary} />
                <Text style={styles.cellDate} numberOfLines={1}>{it.dateLabel}</Text>
              </View>
            ) : null}
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 },
    label: { ...theme.textStyles.microLabel, color: colors.textSecondary },
    seeAll: { fontFamily: theme.fonts.medium, fontSize: 13, color: colors.accent },

    row: { flexDirection: "row", gap: 10 },
    cell: { flex: 1, gap: 6 },
    coverWrap: { width: "100%", aspectRatio: 1, borderRadius: theme.borderRadius.cardSmall, overflow: "hidden", position: "relative" },
    cover: { width: "100%", height: "100%" },
    coverPh: { alignItems: "center", justifyContent: "center" },
    // Host avatar — white ring; placeholder is a NEUTRAL dark chip (not the kind
    // tint) so it stays visible on the same-colored cover placeholder.
    hostAvatar: {
      position: "absolute",
      left: 6,
      bottom: 6,
      width: 24,
      height: 24,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      padding: 1.5,
    },
    hostAvatarImg: { width: "100%", height: "100%", borderRadius: 7 },
    hostAvatarPh: { alignItems: "center", justifyContent: "center", backgroundColor: colors.cardDark },
    cellTitle: { fontFamily: theme.fonts.bold, fontSize: 12, lineHeight: 15, color: colors.textPrimary, letterSpacing: -0.1 },
    dateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    cellDate: { flex: 1, fontFamily: theme.fonts.monoMedium, fontSize: 10, color: colors.textTertiary },
  });
