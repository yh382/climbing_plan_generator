// src/features/community/events/component/EventListCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import type { EventInfoCardModel } from "../data/types";

type Styles = {
  wrap: ViewStyle;
  headerRow: ViewStyle;
  title: TextStyle;
  list: ViewStyle;
  empty: TextStyle;

  row: ViewStyle;
  rankPill: ViewStyle;
  rankText: TextStyle;

  primary: TextStyle;
  secondary: TextStyle;
  trailing: TextStyle;
};

export default function EventListCard({ card }: { card: EventInfoCardModel }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows = useMemo(() => {
    const list = card.items ?? [];
    if (!card.showRank) return list;
    // rank: 1..n（也允许 item 自己提供 rank）
    return list.map((it, idx) => ({ ...it, rank: it.rank ?? idx + 1 }));
  }, [card.items, card.showRank]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{card.title}</Text>
        {card.trailingIcon ? (
          <Ionicons name={card.trailingIcon as any} size={18} color={colors.textTertiary} />
        ) : null}
      </View>

      <View style={styles.list}>
        {rows.length === 0 ? (
          <Text style={styles.empty}>No data.</Text>
        ) : (
          rows.map((it) => (
            <View key={it.id} style={styles.row}>
              {card.showRank ? (
                <View style={styles.rankPill}>
                  <Text style={styles.rankText}>{it.rank}</Text>
                </View>
              ) : null}

              <View style={{ flex: 1 }}>
                <Text style={styles.primary} numberOfLines={1}>
                  {it.primary}
                </Text>
                {it.secondary ? (
                  <Text style={styles.secondary} numberOfLines={1}>
                    {it.secondary}
                  </Text>
                ) : null}
              </View>

              {it.trailing ? <Text style={styles.trailing}>{it.trailing}</Text> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create<Styles>({
  wrap: {
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontFamily: theme.fonts.black, color: colors.textPrimary },

  list: { gap: 10 },
  empty: { color: colors.textTertiary, fontFamily: theme.fonts.medium },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontFamily: theme.fonts.black, color: colors.textPrimary },

  primary: { fontSize: 14, fontFamily: theme.fonts.black, color: colors.textPrimary },
  secondary: { marginTop: 2, fontSize: 12, fontFamily: theme.fonts.bold, color: colors.textSecondary },
  trailing: { fontSize: 12, fontFamily: theme.fonts.black, color: colors.textPrimary },
});
