// app/library/exercise-categories.tsx
// Hub page: 2-column grid of the 5 big exercise category cards

import React, { useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { useThemeColors } from "@/lib/useThemeColors";
import { NATIVE_HEADER_LARGE, withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { theme } from "@/lib/theme";
import { useSettings } from "@/contexts/SettingsContext";
import {
  USER_TAXONOMY,
  type BigCat,
} from "@/features/home/exercises/model/userTaxonomy";

function iconForBig(big: BigCat): keyof typeof Ionicons.glyphMap {
  if (big === "essentials") return "sunny-outline";
  if (big === "endurance") return "water-outline";
  if (big === "power_endurance") return "flame-outline";
  if (big === "strength_power") return "flash-outline";
  return "barbell-outline";
}

const ORDER: BigCat[] = [
  "strength_power",
  "endurance",
  "power_endurance",
  "conditioning",
  "essentials",
];

export default function ExerciseCategoriesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { lang, tr } = useSettings();
  const s = useMemo(() => createStyles(colors), [colors]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_LARGE,
      ...withHeaderTheme(colors),
      headerShown: true,
      title: tr("动作库", "Exercise Library"),
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      headerRight: () => <HeaderButton icon="heart" onPress={() => router.push("/library/exercise-favorites")} />,
    });
  }, [navigation, colors, router, tr]);

  const ordered = useMemo(() => {
    const map = new Map<BigCat, (typeof USER_TAXONOMY)[number]>();
    for (const c of USER_TAXONOMY) map.set(c.key as BigCat, c);
    return ORDER.map((k) => map.get(k)).filter(Boolean) as (typeof USER_TAXONOMY)[number][];
  }, []);

  // Build rows of 2
  const rows = useMemo(() => {
    const result: (typeof USER_TAXONOMY[number] | null)[][] = [];
    for (let i = 0; i < ordered.length; i += 2) {
      result.push([ordered[i], ordered[i + 1] ?? null]);
    }
    return result;
  }, [ordered]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={s.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {rows.map((row, ri) => (
        <View key={ri} style={s.row}>
          {row.map((cat, ci) =>
            cat ? (
              <TouchableOpacity
                key={cat.key}
                activeOpacity={0.85}
                style={[s.card, { backgroundColor: colors.cardDark }]}
                onPress={() =>
                  router.push({
                    pathname: "/library/exercises",
                    params: { big: cat.key },
                  })
                }
              >
                <View style={s.iconCircle}>
                  <Ionicons
                    name={iconForBig(cat.key as BigCat)}
                    size={22}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={s.cardTitle} numberOfLines={2}>
                  {cat.title[lang]}
                </Text>
                <Text style={s.cardSub} numberOfLines={2}>
                  {cat.homePreview[lang].join("\n")}
                </Text>
              </TouchableOpacity>
            ) : (
              <View key={`empty-${ci}`} style={s.cardPlaceholder} />
            )
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 12,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    card: {
      flex: 1,
      borderRadius: theme.borderRadius.card,
      padding: 14,
      justifyContent: "flex-start",
      minHeight: 140,
    },
    cardPlaceholder: {
      flex: 1,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
      marginBottom: 6,
    },
    cardSub: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.55)",
      lineHeight: 17,
    },
  });
