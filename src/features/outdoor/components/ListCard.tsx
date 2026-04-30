// src/features/outdoor/components/ListCard.tsx
// A single user list card (cover, name, item_count, visibility icon).

import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";
import type { OutdoorList } from "../types";

type Props = {
  list: OutdoorList;
  onPress: () => void;
  coverUrl?: string;
};

export default function ListCard({ list, onPress, coverUrl }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.coverWrap}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="list" size={28} color={colors.textTertiary} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{list.name}</Text>
        <Text style={styles.metaText}>
          {list.item_count} {tr("条路线", list.item_count === 1 ? "route" : "routes")}
        </Text>
      </View>
      <View style={styles.chevron}>
        <Text style={{ color: colors.textTertiary, fontSize: 16 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.backgroundSecondary,
      marginBottom: 8,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
    },
    coverWrap: { width: 72, height: 72 },
    cover: { width: 72, height: 72 },
    coverPlaceholder: {
      width: 72,
      height: 72,
      backgroundColor: c.cardBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    body: { flex: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 4 },
    name: { fontFamily: theme.fonts.bold, fontSize: 16, color: c.textPrimary },
    metaText: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
    },
    chevron: { paddingRight: 14, justifyContent: "center" },
  });
