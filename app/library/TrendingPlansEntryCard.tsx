import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "../../src/lib/useThemeColors";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function TrendingPlansEntryCard({
  title = "Trending Plans",
  subtitle = "See what the community is training this week",
}: Props) {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          <Ionicons name="trending-up" size={20} color={colors.textPrimary} />
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>Explore</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
      </View>
    </TouchableOpacity>
  );
}

type Colors = ReturnType<typeof useThemeColors>;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardBackground,
      padding: 14,
      marginBottom: 12,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    title: { fontSize: 16, fontWeight: "900", color: colors.textPrimary },
    subtitle: { marginTop: 4, fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    ctaRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 },
    ctaText: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  });
