// src/features/home/exercises/components/SubcategoryTabs.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
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

const styles = StyleSheet.create({
  tab: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  tabText: { fontSize: 13, color: "#6B7280", fontWeight: "700" },
  tabTextActive: { color: "#FFF" },
});
