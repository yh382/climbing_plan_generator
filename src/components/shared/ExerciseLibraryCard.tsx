// src/components/shared/ExerciseLibraryCard.tsx

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

type LocaleKey = "zh" | "en";

interface Props {
  title: string;
  description?: string;
  goal?: string;
  level?: string;
  minutes?: number | null;
  imageUrl?: string | null;
  onPress?: () => void;
  locale: LocaleKey;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export default function ExerciseLibraryCard({
  title,
  description,
  goal,
  level,
  minutes,
  imageUrl,
  onPress,
  locale,
  isFavorite,
  onToggleFavorite,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardImgWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImg} />
        ) : (
          <View style={styles.cardImgPlaceholder} />
        )}
      </View>

      <View style={styles.cardRight}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          {onToggleFavorite && (
            <TouchableOpacity onPress={onToggleFavorite} hitSlop={8}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={18}
                color={isFavorite ? colors.accent : colors.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        {description ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        <Text style={styles.cardMeta} numberOfLines={1}>
          {goal} · {level}
        </Text>

        <View style={styles.cardBottomRow}>
          <View style={styles.iconRow}>
            <View style={styles.miniIconPill}>
              <Ionicons name="pricetag-outline" size={14} color={colors.textTertiary} />
            </View>
            <View style={styles.miniIconPill}>
              <Ionicons name="construct-outline" size={14} color={colors.textTertiary} />
            </View>
            <View style={styles.miniIconPill}>
              <Ionicons name="fitness-outline" size={14} color={colors.textTertiary} />
            </View>
          </View>

          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.timeText}>{minutes ? `${minutes}` : "--"}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    minHeight: 100,
  },
  cardImgWrap: {
    width: 88,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  cardImg: { width: "100%", height: "100%", resizeMode: "cover" as const },
  cardImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardRight: { flex: 1, paddingRight: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  cardTitle: { fontSize: 15, fontFamily: theme.fonts.bold, color: colors.textPrimary, flexShrink: 1 },
  cardSubtitle: { marginTop: 3, fontSize: 13, color: colors.textSecondary, fontFamily: theme.fonts.regular, lineHeight: 18 },
  cardMeta: { marginTop: 3, fontSize: 11.5, color: "#6B7280" },

  cardBottomRow: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  miniIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },

  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: { fontSize: 13, fontFamily: theme.fonts.monoMedium, color: colors.textSecondary },
});
