import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function TrendingPlansEntryCard({
  title = "Trending Plans",
  subtitle = "See what the community is training this week",
}: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push("/library/trending-plans")}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.iconWrap}>
          <Ionicons name="trending-up" size={20} color="#111" />
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>Explore</Text>
        <Ionicons name="chevron-forward" size={18} color="#111" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 16, fontWeight: "900", color: "#111" },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: "#6B7280" },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  ctaText: { fontSize: 13, fontWeight: "800", color: "#111" },
});
