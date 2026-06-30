// Route-detail header row (P2-A): a compact "History" card (this user's
// attempts + sends on this route) beside a "Map" thumbnail (the floor plan
// cropped around the route's pin → tap opens the gym floor plan).
//
// Data note (review): the route object carries pin_x/pin_y but NOT
// floor_plan_url (that's on Gym), so the Map card fetches the gym. pin_x/pin_y
// can be null (legacy/unpinned) → the Map card is omitted and History goes
// full-width.
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { theme } from "../../../lib/theme";
import { useThemeColors } from "../../../lib/useThemeColors";
import { useSettings } from "../../../contexts/SettingsContext";
import { gymsCatalogApi } from "../api";
import type { GymRoute, GymRouteAscent } from "../types";

const MAP = 96; // map card square side (px)
const CROP = 0.42; // fraction of the floor plan shown around the pin

export default function RouteStatsCards({
  route,
  ascents,
  currentUserId,
}: {
  route: GymRoute;
  ascents: GymRouteAscent[];
  currentUserId: string | null | undefined;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();

  const { attempts, sends } = useMemo(() => {
    const mine = currentUserId
      ? ascents.filter((a) => a.user_id === currentUserId)
      : [];
    return {
      attempts: mine.filter((a) => a.result === "attempt").length,
      sends: mine.filter((a) => a.result !== "attempt").length,
    };
  }, [ascents, currentUserId]);

  const px = route.pin_x ?? null;
  const py = route.pin_y ?? null;
  const hasPin = px != null && py != null;

  const [floorUrl, setFloorUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!hasPin || !route.gym_id) return;
    let alive = true;
    gymsCatalogApi
      .getGym(route.gym_id)
      .then((g) => {
        if (alive) setFloorUrl(g.floor_plan_url ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [route.gym_id, hasPin]);

  const showMap = hasPin && !!floorUrl;

  // Crop transform: render the floor plan oversized + translated so the pin
  // sits ~centered in the MAP×MAP window; clamp to edges; place the dot at the
  // pin's true position within the displayed image.
  let imgStyle: { width: number; height: number; left: number; top: number } | null =
    null;
  let dot: { left: number; top: number } | null = null;
  if (showMap && dims && px != null && py != null) {
    const displayW = MAP / CROP;
    const displayH = displayW * (dims.h / dims.w);
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v));
    const left = clamp(MAP / 2 - px * displayW, MAP - displayW, 0);
    const top = clamp(MAP / 2 - py * displayH, MAP - displayH, 0);
    imgStyle = { width: displayW, height: displayH, left, top };
    dot = { left: left + px * displayW - 5, top: top + py * displayH - 5 };
  }

  return (
    <View style={styles.row}>
      <View style={[styles.card, styles.hist]}>
        <Text style={styles.histTitle}>{tr("历史", "History")}</Text>
        <View style={styles.histRow}>
          <Text style={styles.histLabel}>{tr("尝试", "Attempts")}</Text>
          <Text style={styles.histVal}>{attempts}</Text>
        </View>
        <View style={styles.histRow}>
          <Text style={styles.histLabel}>{tr("完攀", "Sends")}</Text>
          <Text style={styles.histVal}>{sends}</Text>
        </View>
      </View>

      {showMap ? (
        <Pressable
          style={[styles.card, styles.mapCard]}
          onPress={() => router.push(`/gym/${route.gym_id}` as any)}
          accessibilityRole="button"
          accessibilityLabel={tr("在楼层图查看", "View on floor plan")}
        >
          <Image
            source={{ uri: floorUrl! }}
            style={imgStyle ? { position: "absolute", ...imgStyle } : StyleSheet.absoluteFill}
            contentFit={imgStyle ? "fill" : "cover"}
            onLoad={(e) => {
              const s = e.source;
              if (s?.width && s?.height) setDims({ w: s.width, h: s.height });
            }}
          />
          {dot ? <View style={[styles.dot, dot]} /> : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: 10, marginTop: 14 },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hist: { flex: 1, paddingVertical: 11, paddingHorizontal: 14, justifyContent: "center" },
    histTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    histRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      paddingVertical: 2,
    },
    histLabel: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: colors.textSecondary,
    },
    histVal: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 16,
      color: colors.textPrimary,
    },
    mapCard: { width: MAP, height: MAP, overflow: "hidden" },
    dot: {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
  });
