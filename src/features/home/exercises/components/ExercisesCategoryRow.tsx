// src/features/home/exercises/components/ExercisesCategoryRow.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { USER_TAXONOMY, type BigCat, type LocaleKey } from "../model/userTaxonomy";

function detectLocale(): LocaleKey {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale || "en";
    return loc.toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}

function iconForBig(big: BigCat): keyof typeof Ionicons.glyphMap {
  if (big === "endurance") return "water-outline";
  if (big === "power_endurance") return "flame-outline";
  if (big === "strength_power") return "flash-outline";
  return "barbell-outline";
}

function bgForBig(big: BigCat) {
  if (big === "endurance") return "#EFF6FF";
  if (big === "power_endurance") return "#FFF7ED";
  if (big === "strength_power") return "#F5F3FF";
  return "#F0FDF4";
}

/**
 * Home row: shows ONLY the 4 big library entry cards.
 * Requirements:
 * 1) Horizontal padding aligns with other Home sections -> fixed 16 here (do not wrap another 16 outside)
 * 2) Cards slightly wider
 * 3) Strength & Power card should be first (Home-only ordering; does not change taxonomy order in library page)
 */
export function ExercisesCategoryRow() {
  const router = useRouter();
  const locale = useMemo(() => detectLocale(), []);

  // Home-only order: Strength & Power first
  const ordered = useMemo(() => {
    const order: BigCat[] = ["strength_power", "endurance", "power_endurance", "conditioning"];
    const map = new Map<BigCat, (typeof USER_TAXONOMY)[number]>();
    for (const c of USER_TAXONOMY) map.set(c.key as BigCat, c);
    return order.map((k) => map.get(k)).filter(Boolean) as (typeof USER_TAXONOMY)[number][];
  }, []);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {ordered.map((cat) => {
        const title = cat.title[locale];
        const lines = cat.homePreview[locale];

        return (
          <TouchableOpacity
            key={cat.key}
            activeOpacity={0.9}
            style={[styles.card, { backgroundColor: bgForBig(cat.key as BigCat) }]}
            onPress={() =>
              router.push({
                pathname: "/library/exercises",
                params: { big: cat.key },
              })
            }
          >
            <View style={styles.topRow}>
              <View style={styles.iconCircle}>
                <Ionicons name={iconForBig(cat.key as BigCat)} size={22} color="#111" />
              </View>
              <Ionicons name="chevron-forward" size={18} color="#111" />
            </View>

            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>

            <View style={{ marginTop: 6 }}>
              {lines.map((t) => (
                <Text key={t} style={styles.subLine} numberOfLines={1}>
                  {t}
                </Text>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Keep this as the ONLY horizontal padding source for alignment with other Home sections
  container: {
    paddingHorizontal: 0,
    gap: 12,
  },

  // Wider than before
  card: {
    width: 210, // was 180
    borderRadius: 18,
    padding: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "900",
    color: "#111",
  },

  subLine: {
    fontSize: 12.5,
    color: "#374151",
    lineHeight: 16,
  },
});
