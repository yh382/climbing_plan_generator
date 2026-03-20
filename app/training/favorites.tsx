// app/training/favorites.tsx — ExerciseFavoritesScreen

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useI18N } from "../../lib/i18n";

const FAVORITES_KEY = "@exercise_favorites";

interface FavoriteExercise {
  id: string;
  name: { zh?: string; en?: string } | string;
  type?: string;
  image?: string;
}

export async function getFavoriteExercises(): Promise<FavoriteExercise[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleFavoriteExercise(exercise: FavoriteExercise): Promise<boolean> {
  const current = await getFavoriteExercises();
  const exists = current.findIndex((e) => e.id === exercise.id);
  let updated: FavoriteExercise[];
  let isFav: boolean;
  if (exists >= 0) {
    updated = current.filter((e) => e.id !== exercise.id);
    isFav = false;
  } else {
    updated = [...current, exercise];
    isFav = true;
  }
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return isFav;
}

export async function isExerciseFavorited(exerciseId: string): Promise<boolean> {
  const favorites = await getFavoriteExercises();
  return favorites.some((e) => e.id === exerciseId);
}

export default function ExerciseFavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isZH, tt, tr } = useI18N();
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    const favs = await getFavoriteExercises();
    setFavorites(favs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = useCallback(async (id: string) => {
    setFavorites((prev) => prev.filter((e) => e.id !== id));
    const current = await getFavoriteExercises();
    const updated = current.filter((e) => e.id !== id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  }, []);

  const handlePress = useCallback((item: FavoriteExercise) => {
    router.push(`/library/exercise-detail?exerciseId=${item.id}` as any);
  }, [router]);

  const renderItem = ({ item }: { item: FavoriteExercise }) => {
    const name = typeof item.name === "string" ? item.name : tt(item.name);
    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePress(item)} activeOpacity={0.7}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="barbell-outline" size={20} color="#D1D5DB" />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
          {item.type && <Text style={styles.cardType}>{item.type}</Text>}
        </View>
        <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={12}>
          <Ionicons name="heart" size={22} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tr("收藏动作", "Favorite Exercises")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* List */}
      {!loading && favorites.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>{tr("暂无收藏动作", "No favorite exercises yet")}</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: "#111", textAlign: "center" },
  listContent: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardImage: { width: 48, height: 48, borderRadius: 10 },
  cardImagePlaceholder: { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111" },
  cardType: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, color: "#9CA3AF" },
});
