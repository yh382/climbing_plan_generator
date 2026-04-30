// src/features/activity/FavoriteExercisesGrid.tsx
// Compact list of up to N favorite exercises with "See all" link.
// Used in Activity > Training segment.

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";
import ExerciseLibraryCard from "../../components/shared/ExerciseLibraryCard";
import { getFavoriteExercises } from "../home/exercises/favoritesApi";
import { GOAL_LABEL, LEVEL_LABEL } from "../home/exercises/model/labels";

const MAX_PREVIEW = 3;

type FavExercise = {
  id: string;
  name_zh: string;
  name_en: string;
  goal?: string;
  level?: string;
  duration_min?: number;
  muscles?: string[];
  equipment?: string[];
  media?: any;
};

export default function FavoriteExercisesGrid() {
  const router = useRouter();
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale: "zh" | "en" = lang === "en" ? "en" : "zh";

  const [exercises, setExercises] = useState<FavExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFavoriteExercises();
        if (!cancelled) setExercises((data as FavExercise[]) || []);
      } catch {
        // silent — user may be offline
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const preview = exercises.slice(0, MAX_PREVIEW);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr("收藏动作", "Favorite Exercises")}</Text>
        <TouchableOpacity onPress={() => router.push("/library/exercise-favorites" as any)} hitSlop={8} style={styles.seeAllBtn}>
          <Text style={styles.seeAllText}>{tr("全部", "See all")}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.emptyWrap}><ActivityIndicator /></View>
      ) : preview.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{tr("还没有收藏", "No favorites yet")}</Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {preview.map((ex) => (
            <ExerciseLibraryCard
              key={ex.id}
              locale={locale}
              title={locale === "zh" ? ex.name_zh : ex.name_en}
              goal={ex.goal ? ((GOAL_LABEL as any)?.[locale]?.[ex.goal] ?? ex.goal) : undefined}
              level={ex.level ? ((LEVEL_LABEL as any)?.[locale]?.[ex.level] ?? ex.level) : undefined}
              minutes={ex.duration_min ?? null}
              imageUrl={ex.media?.thumbnail_url || ex.media?.image_url || null}
              equipment={ex.equipment ?? []}
              onPress={() =>
                router.push({ pathname: "/library/exercise-detail", params: { exerciseId: ex.id } } as any)
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 16, paddingTop: 24 },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    title: { fontSize: 18, fontFamily: theme.fonts.black, color: colors.textPrimary },
    seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
    seeAllText: { fontSize: 14, fontFamily: theme.fonts.medium, color: colors.textSecondary },
    emptyWrap: { paddingVertical: 20, alignItems: "center" },
    emptyText: { fontSize: 13, color: colors.textTertiary, fontFamily: theme.fonts.regular },
  });
