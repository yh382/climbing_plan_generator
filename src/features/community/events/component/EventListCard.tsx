// src/features/community/events/component/EventListCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
          <Ionicons name={card.trailingIcon as any} size={18} color="#9CA3AF" />
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

const styles = StyleSheet.create<Styles>({
  wrap: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "900", color: "#111827" },

  list: { gap: 10 },
  empty: { color: "#9CA3AF", fontWeight: "800" },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontWeight: "900", color: "#111827" },

  primary: { fontSize: 14, fontWeight: "900", color: "#111827" },
  secondary: { marginTop: 2, fontSize: 12, fontWeight: "800", color: "#6B7280" },
  trailing: { fontSize: 12, fontWeight: "900", color: "#111827" },
});
