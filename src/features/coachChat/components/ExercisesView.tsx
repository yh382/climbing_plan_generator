// src/features/coachChat/components/ExercisesView.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { CardDark } from "@/components/ui";
import {
  USER_TAXONOMY,
  type BigCat,
} from "../../home/exercises/model/userTaxonomy";
import { useSettings } from "../../../contexts/SettingsContext";

function iconForBig(big: BigCat): keyof typeof Ionicons.glyphMap {
  if (big === "essentials") return "sunny-outline";
  if (big === "endurance") return "water-outline";
  if (big === "power_endurance") return "flame-outline";
  if (big === "strength_power") return "flash-outline";
  return "barbell-outline";
}

export default function ExercisesView() {
  const router = useRouter();
  const { tr } = useSettings();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const categories = useMemo(() => {
    return USER_TAXONOMY.map((cat) => ({
      key: cat.key,
      title: tr(cat.title.zh, cat.title.en),
      subtitle: tr(
        cat.homePreview.zh.join(" · "),
        cat.homePreview.en.join(" · "),
      ),
      icon: iconForBig(cat.key as BigCat),
    }));
  }, [tr]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.grid}
      showsVerticalScrollIndicator={false}
    >
      {/* My Favorites entry */}
      <Pressable
        style={styles.favWrapper}
        onPress={() => router.push("/library/exercise-favorites")}
      >
        <View style={styles.favCard}>
          <Ionicons name="heart" size={18} color={colors.accent} />
          <Text style={styles.favText}>{tr("我的收藏", "My Favorites")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: "auto" }} />
        </View>
      </Pressable>

      {categories.map((cat) => (
        <Pressable
          key={cat.key}
          style={styles.cardWrapper}
          onPress={() =>
            router.push({
              pathname: "/library/exercises",
              params: { big: cat.key },
            })
          }
        >
          <CardDark style={styles.card}>
            <View style={styles.cardContent}>
              {/* Text — bottom left */}
              <View style={styles.textArea}>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <Text style={styles.categorySubtitle} numberOfLines={2}>
                  {cat.subtitle}
                </Text>
              </View>
              {/* Icon — top right */}
              <View style={styles.iconArea}>
                <Ionicons name={cat.icon} size={28} color="rgba(255,255,255,0.3)" />
              </View>
            </View>
          </CardDark>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const CARD_GAP = theme.spacing.cardGap;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH =
  (SCREEN_WIDTH - theme.spacing.screenPadding * 2 - CARD_GAP) / 2;

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: theme.spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 40,
    gap: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    minHeight: 110,
  },
  cardContent: {
    flex: 1,
    padding: theme.spacing.cardPadding,
    justifyContent: "space-between",
  },
  textArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  categoryTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  categorySubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginTop: 3,
  },
  iconArea: {
    position: "absolute",
    top: theme.spacing.cardPadding,
    right: theme.spacing.cardPadding,
  },
  favWrapper: {
    width: "100%" as any,
  },
  favCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.card,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  favText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
