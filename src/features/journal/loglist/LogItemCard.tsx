import React, { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Feel, LocalDayLogItem } from "./types";
import { useThemeColors } from "@/lib/useThemeColors";

type Props = {
  item: LocalDayLogItem;
  labelOf: (grade: string) => string;
  note?: string;
  onPress: () => void;
  tr: (zh: string, en: string) => string;
};

const StyleBadge = ({ style, color }: { style: LocalDayLogItem["style"]; color: string }) => {
  const isBolt = style === "flash" || style === "onsight";
  const label = style === "flash" ? "Flash" : style === "onsight" ? "Onsight" : "Send";

  return (
    <View style={s0.styleRow}>
      {isBolt ? (
        <Ionicons name="flash-outline" size={14} color={color} />
      ) : (
        <Ionicons name="checkmark-circle-outline" size={14} color={color} />
      )}
      <Text style={[s0.metaText, { color }]}>{label}</Text>
    </View>
  );
};

function FeelPill({ feel, colors }: { feel: Feel; colors: ReturnType<typeof useThemeColors> }) {
  if (feel === "solid") return null;
  const text = feel === "soft" ? "SOFT" : "HARD";
  return (
    <View style={[s0.feelPill, { backgroundColor: colors.pillBackground }]}>
      <Text style={[s0.feelPillText, { color: colors.pillText }]}>{text}</Text>
    </View>
  );
}

export default memo(function LogItemCard({ item, labelOf, note, onPress, tr }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const routeName = (item?.name || "").trim() || tr("未命名路线", "Unnamed Route");
  const attemptsShown =
    typeof item.attemptsTotal === "number"
      ? item.attemptsTotal
      : (item.attempts ?? 1);

  const subtitleAttempts = `${attemptsShown} ${tr("次", "attempts")}`;

  const firstMedia = item.media?.[0];
  const cover =
    (firstMedia?.type === "video" ? firstMedia.coverUri : firstMedia?.uri) ||
    item.coverUri ||
    item.imageUri;

  return (
    <View style={{ paddingHorizontal: 3 }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
        <View style={s0.imageWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={s0.image} contentFit="cover" />
          ) : (
            <View style={[s0.image, styles.noImage]}>
              <Text style={styles.noImageText}>{labelOf(item.grade)}</Text>
            </View>
          )}
        </View>

        <View style={s0.info}>
          <View style={s0.topRow}>
            <Text style={styles.routeName} numberOfLines={1}>
              {routeName}
            </Text>
            <FeelPill feel={item.feel} colors={colors} />
          </View>

          <View style={s0.metaRow}>
            <StyleBadge style={item.style} color={colors.chartLabel} />
            <Text style={[s0.metaDot, { color: colors.border }]}>•</Text>
            <Text style={[s0.metaText, { color: colors.chartLabel }]}>{subtitleAttempts}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {note ? (
        <View style={styles.noteBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.chartLabel} />
          <Text style={styles.noteText} numberOfLines={2}>
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

// Static styles (no color dependency)
const s0 = StyleSheet.create({
  imageWrap: { width: 76, height: 76 },
  image: { width: "100%", height: "100%" },
  styleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { fontSize: 12, fontWeight: "800" },
  metaDot: { marginHorizontal: 6, fontSize: 12, fontWeight: "900" },
  feelPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  feelPillText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
});

// Dynamic styles (theme-dependent)
const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.background,
      borderRadius: 12,
      borderWidth: 0.4,
      borderColor: c.cardBorder,
      flexDirection: "row",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    noImage: { backgroundColor: c.cardDarkImage, alignItems: "center", justifyContent: "center" },
    noImageText: { fontSize: 14, fontFamily: "DMMono_500Medium", color: c.textSecondary },
    routeName: { flex: 1, fontSize: 15, fontFamily: "DMSans_900Black", color: c.textPrimary, letterSpacing: -0.2 },
    noteBubble: {
      marginTop: 8,
      backgroundColor: c.backgroundSecondary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    noteText: { flex: 1, color: c.textSecondary, fontSize: 13, fontWeight: "700" },
  });
