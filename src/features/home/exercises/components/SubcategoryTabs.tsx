// src/features/home/exercises/components/SubcategoryTabs.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";
import type { LocaleKey, UserSection, SubCatKey } from "../model/userTaxonomy";

export function SubcategoryTabs({
  locale,
  sections,
  active,
  onChange,
}: {
  locale: LocaleKey;
  sections: UserSection[];
  active: SubCatKey;
  onChange: (k: SubCatKey) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={{ height: 46 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, alignItems: "center", gap: 8 }}
      >
        {sections.map((s) => {
          const isActive = s.key === active;
          const label = s.title[locale];

          return (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.85}
              onPress={() => onChange(s.key)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  tab: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#1C1C1E",
  },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: "700" },
  tabTextActive: { color: "#FFF" },
});
