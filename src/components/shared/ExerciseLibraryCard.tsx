// src/components/shared/ExerciseLibraryCard.tsx

import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { getClimbingTypeIcons, CLIMBING_TYPE_ICON } from "../ui/icons/equipmentIcons";

type LocaleKey = "zh" | "en";

interface Props {
  title: string;
  description?: string;
  goal?: string;
  level?: string;
  minutes?: number | null;
  imageUrl?: string | null;
  equipment?: string[];
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
  equipment,
  onPress,
  locale,
  isFavorite,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const climbingTypes = useMemo(() => getClimbingTypeIcons(equipment), [equipment]);

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
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>

        {description ? (
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {description}
          </Text>
        ) : null}

        <Text style={styles.cardMeta} numberOfLines={1}>
          {goal} · {level}
        </Text>

        <View style={styles.cardBottomRow}>
          {climbingTypes.length > 0 && (
            <View style={styles.iconRow}>
              {climbingTypes.map((key) => {
                const Icon = CLIMBING_TYPE_ICON[key];
                return (
                  <View key={key} style={styles.miniIconPill}>
                    <Icon size={28} color="#3C3C3C" />
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.timePill}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.timeText}>{minutes ? `${minutes}` : "--"}</Text>
          </View>
        </View>
      </View>

      {/* Favorite indicator — non-interactive */}
      {isFavorite && (
        <View style={styles.favIndicator}>
          <Ionicons name="heart" size={16} color={colors.accent} />
        </View>
      )}
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
    backgroundColor: colors.backgroundSecondary,
  },
  cardImg: { width: "100%", height: "100%", resizeMode: "cover" as const },
  cardImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardRight: { flex: 1, paddingRight: 2 },

  cardTitle: { fontSize: 15, fontFamily: theme.fonts.bold, color: colors.textPrimary },

  favIndicator: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  cardSubtitle: { marginTop: 3, fontSize: 13, color: colors.textSecondary, fontFamily: theme.fonts.regular, lineHeight: 18 },
  cardMeta: { marginTop: 3, fontSize: 11.5, color: colors.textSecondary },

  cardBottomRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  miniIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
