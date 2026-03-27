// app/library/exercise-favorites.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";

import ExerciseLibraryCard from "@/components/shared/ExerciseLibraryCard";
import { useThemeColors } from "@/lib/useThemeColors";
import {
  getFavoriteExercises,
  removeFavorite,
} from "@/features/home/exercises/favoritesApi";

type LocaleKey = "zh" | "en";

function detectLocale(): LocaleKey {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

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

const ALL_KEY = "__all__";

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F9FAFB" },
  loadingText: { marginTop: 10, color: "#6B7280", fontSize: 12 },

  tabsWrap: { marginTop: 8, marginBottom: 12 },
  tabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#1C1C1E",
    borderColor: "#1C1C1E",
  },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: "700" },
  tabTextActive: { color: "#FFF" },

  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptyHint: { marginTop: 8, fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 18 },
});

export default function ExerciseFavoritesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale = useMemo(() => detectLocale(), []);

  const [exercises, setExercises] = useState<FavExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const [activeGoal, setActiveGoal] = useState(ALL_KEY);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getFavoriteExercises();
      if (mountedRef.current) setExercises(data);
    } catch {
      // silent
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  // dynamic goal tabs from fetched exercises
  const goalTabs = useMemo(() => {
    const goals = new Set<string>();
    for (const ex of exercises) {
      if (ex.goal) goals.add(ex.goal);
    }
    const sorted = Array.from(goals).sort();
    return [
      { key: ALL_KEY, label: locale === "zh" ? "全部" : "All" },
      ...sorted.map((g) => ({ key: g, label: g.charAt(0).toUpperCase() + g.slice(1) })),
    ];
  }, [exercises, locale]);

  const filtered = useMemo(() => {
    if (activeGoal === ALL_KEY) return exercises;
    return exercises.filter((ex) => ex.goal === activeGoal);
  }, [exercises, activeGoal]);

  const handleUnfavorite = useCallback(
    async (id: string) => {
      // optimistic remove
      setExercises((prev) => prev.filter((e) => e.id !== id));
      try {
        await removeFavorite(id);
      } catch {
        // rollback: reload
        load();
      }
    },
    [load]
  );

  const titleText = locale === "zh" ? "我的收藏" : "My Favorites";

  const TabsHeader = goalTabs.length > 1 ? (
    <View style={styles.tabsWrap}>
      <View style={styles.tabsRow}>
        {goalTabs.map((t) => {
          const isActive = t.key === activeGoal;
          return (
            <TouchableOpacity
              key={t.key}
              activeOpacity={0.85}
              onPress={() => setActiveGoal(t.key)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ) : null;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>
          {locale === "zh" ? "加载中…" : "Loading…"}
        </Text>
      </View>
    );
  }

  const EmptyState = exercises.length === 0 ? (
    <View style={styles.emptyWrap}>
      <Ionicons name="heart-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {locale === "zh" ? "还没有收藏" : "No favorites yet"}
      </Text>
      <Text style={styles.emptyHint}>
        {locale === "zh"
          ? "在动作库中点击 ♡ 收藏你喜欢的训练动作"
          : "Tap ♡ on exercises in the library to save them here"}
      </Text>
    </View>
  ) : null;

  return (
    <>
      <Stack.Screen options={{
        ...NATIVE_HEADER_LARGE,
        title: titleText,
      }} />
      <FlatList
        style={{ backgroundColor: "#F9FAFB" }}
        data={filtered}
        keyExtractor={(item: FavExercise) => String(item.id)}
        renderItem={({ item }: { item: FavExercise }) => (
          <ExerciseLibraryCard
            title={locale === "zh" ? item.name_zh : item.name_en}
            goal={item.goal}
            level={item.level}
            minutes={item.duration_min ?? null}
            imageUrl={item.media?.thumbnail_url || item.media?.image_url || null}
            locale={locale}
            isFavorite
            onToggleFavorite={() => handleUnfavorite(item.id)}
            onPress={() =>
              router.push({
                pathname: "/library/exercise-detail",
                params: { exerciseId: String(item.id), context: "library" },
              })
            }
          />
        )}
        ListHeaderComponent={
          <View>
            {TabsHeader}
            {EmptyState}
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 0 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
