import { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import type { ChallengeOut } from "./types";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - 22 * 2 - 10) / 2;

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
        <View style={styles.coverPlaceholder}>
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

        <Text style={styles.joined}>{item.participantCount} joined</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    width: CARD_W,
    borderRadius: 14,
    backgroundColor: colors.cardDark,
    overflow: "hidden",
  },
  cover: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  coverPlaceholder: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardDarkImage,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
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
    padding: 11,
    flex: 1,
    justifyContent: "space-between",
  },
  title: { fontSize: 13, fontWeight: "800", color: "#FFF", letterSpacing: -0.3, lineHeight: 18 },
  joined: { fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 },
});
