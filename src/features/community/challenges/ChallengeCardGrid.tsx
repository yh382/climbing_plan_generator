import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getChallengeStatus } from "./types";
import type { ChallengeOut } from "./types";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - 48) / 2; // 16 padding each side + 16 gap

const DISCIPLINE_ICON: Record<string, string> = {
  boulder: "cube",
  rope: "git-commit",
  lead: "arrow-up",
  speed: "flash",
  mixed: "layers",
};

export default function ChallengeCardGrid({
  item,
  onPress,
}: {
  item: ChallengeOut;
  onPress?: () => void;
}) {
  const uiStatus = getChallengeStatus(item);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Cover or color */}
      {item.coverUrl ? (
        <ImageBackground
          source={{ uri: item.coverUrl }}
          style={styles.cover}
          imageStyle={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}
        >
          <View style={styles.coverOverlay} />
          {item.discipline && (
            <View style={styles.disciplineChip}>
              <Ionicons
                name={(DISCIPLINE_ICON[item.discipline] ?? "ellipse") as any}
                size={12}
                color="#FFF"
              />
              <Text style={styles.disciplineText}>{item.discipline}</Text>
            </View>
          )}
        </ImageBackground>
      ) : (
        <View
          style={[
            styles.cover,
            {
              backgroundColor:
                uiStatus === "active"
                  ? "#059669"
                  : uiStatus === "upcoming"
                  ? "#D97706"
                  : "#6B7280",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
            },
          ]}
        >
          <Ionicons name="trophy" size={28} color="rgba(255,255,255,0.4)" />
          {item.discipline && (
            <View style={styles.disciplineChip}>
              <Ionicons
                name={(DISCIPLINE_ICON[item.discipline] ?? "ellipse") as any}
                size={12}
                color="#FFF"
              />
              <Text style={styles.disciplineText}>{item.discipline}</Text>
            </View>
          )}
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.bottom}>
          <View style={styles.chipsRow}>
            {item.challengeKind ? (
              <View style={styles.kindChip}>
                <Text style={styles.kindText}>{item.challengeKind}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.joined}>{item.participantCount} joined</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  cover: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  disciplineChip: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  disciplineText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    textTransform: "capitalize",
  },
  info: {
    padding: 10,
    flex: 1,
    justifyContent: "space-between",
  },
  title: { fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 18 },
  desc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  bottom: { marginTop: 8 },
  chipsRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  kindChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  kindText: { fontSize: 10, fontWeight: "700", color: "#374151", textTransform: "capitalize" },
  joined: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", marginTop: 4 },
});
