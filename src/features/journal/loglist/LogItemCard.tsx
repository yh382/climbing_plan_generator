import React, { memo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Feel, LocalDayLogItem } from "./types";
import { Feather } from "@expo/vector-icons";

type Props = {
  item: LocalDayLogItem;
  labelOf: (grade: string) => string;
  note?: string;
  onPress: () => void;
  tr: (zh: string, en: string) => string;
};

const StyleBadge = ({ style }: { style: LocalDayLogItem["style"] }) => {
  const isBolt = style === "flash" || style === "onsight";
  const label = style === "flash" ? "Flash" : style === "onsight" ? "Onsight" : "Send";

  return (
    <View style={styles.styleRow}>
      {isBolt ? (
        <Ionicons name="flash-outline" size={14} color="#94A3B8" />
      ) : (
        <Ionicons name="checkmark-circle-outline" size={14} color="#94A3B8" />
      )}
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
};


function FeelPill({ feel }: { feel: Feel }) {
  if (feel === "solid") return null;
  const text = feel === "soft" ? "SOFT" : "HARD";
  return (
    <View style={[styles.feelPill, { backgroundColor: '#1C1C1E' }]}>
      <Text style={[styles.feelPillText, { color: '#FFFFFF' }]}>{text}</Text>
    </View>
  );
}

export default memo(function LogItemCard({ item, labelOf, note, onPress, tr }: Props) {
  const routeName = (item?.name || "").trim() || tr("未命名路线", "Unnamed Route");
  const attemptsShown =
    typeof item.attemptsTotal === "number"
        ? item.attemptsTotal
        : (item.attempts ?? 1);

    const subtitleAttempts = `${attemptsShown} ${tr("次", "attempts")}`;


  const cover = item.coverUri || item.imageUri;

  return (
    <View style={{ paddingHorizontal: 3 }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.card}>
        <View style={styles.imageWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.noImage]}>
              <Text style={styles.noImageText}>{labelOf(item.grade)}</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.routeName} numberOfLines={1}>
              {routeName}
            </Text>
            <FeelPill feel={item.feel} />
          </View>

            <View style={styles.metaRow}>
            <StyleBadge style={item.style} />
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{subtitleAttempts}</Text>
            </View>

        </View>
      </TouchableOpacity>

      {note ? (
        <View style={styles.noteBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#64748B" />
          <Text style={styles.noteText} numberOfLines={2}>
            {note}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 0.4,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  imageWrap: { width: 76, height: 76 },
  image: { width: "100%", height: "100%" },
  noImage: { backgroundColor: "#272727", alignItems: "center", justifyContent: "center" },
  noImageText: { fontSize: 14, fontFamily: "DMMono_500Medium", color: "#888888" },
  styleRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  routeName: { flex: 1, fontSize: 15, fontFamily: "DMSans_900Black", color: "#000000", letterSpacing: -0.2 },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  metaDot: { marginHorizontal: 6, fontSize: 12, fontWeight: "900", color: "#CBD5E1" },

  feelPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  feelPillText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },

  noteBubble: {
    marginTop: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noteText: { flex: 1, color: "#334155", fontSize: 13, fontWeight: "700" },
});
