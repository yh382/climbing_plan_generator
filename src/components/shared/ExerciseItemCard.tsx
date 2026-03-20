// src/components/shared/ExerciseItemCard.tsx
// ~80px compact card for exercises in Builder + Execution modes

import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseExerciseName } from "../../lib/exerciseUtils";

export type ExerciseItemMode = "builder" | "execution";

export interface ExerciseItemData {
  action_id: string;
  sets?: number;
  reps?: number;
  seconds?: number;
  rest_sec?: number;
  name_override?: { zh: string; en: string };
  media?: { video?: string; image?: string; thumbnail_url?: string; image_url?: string; thumb?: string } | null;
  cues?: { zh: string; en: string };
}

interface Props {
  item: ExerciseItemData;
  mode: ExerciseItemMode;
  locale: "zh" | "en";
  completed?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

function getImgUrl(media: ExerciseItemData["media"]): string | null {
  if (!media) return null;
  return (media as any)?.thumbnail_url || (media as any)?.image_url || (media as any)?.thumb || (media as any)?.image || null;
}

export function ExerciseItemCard({ item, mode, locale, completed, onPress, onLongPress }: Props) {
  const rawTitle = item.name_override?.[locale] || item.name_override?.en || item.action_id;
  const { shortName: title } = parseExerciseName(rawTitle);
  const imgUrl = getImgUrl(item.media);

  // Format: "3×8 90s rest"
  let protocolText = "";
  if (item.sets && item.reps) {
    protocolText = `${item.sets}×${item.reps}`;
  } else if (item.sets && item.seconds) {
    protocolText = `${item.sets}×${item.seconds}s`;
  } else if (item.sets) {
    protocolText = `${item.sets} sets`;
  }
  if (item.rest_sec) {
    protocolText += protocolText ? ` · ${item.rest_sec}s rest` : `${item.rest_sec}s rest`;
  }

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      {/* Left: completion check (execution only) */}
      {mode === "execution" ? (
        <View style={s.checkWrap}>
          <Ionicons
            name={completed ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={completed ? "#10B981" : "#D1D5DB"}
          />
        </View>
      ) : null}

      {/* Thumbnail */}
      <View style={s.imgWrap}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={s.img} />
        ) : (
          <View style={s.imgPlaceholder}>
            <Ionicons name="barbell-outline" size={22} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Title + protocol */}
      <View style={s.textWrap}>
        <Text style={[s.title, completed && s.titleDone]} numberOfLines={1}>
          {title}
        </Text>
        {protocolText ? (
          <Text style={s.protocol} numberOfLines={1}>{protocolText}</Text>
        ) : (
          <Text style={s.protocol}>Tap to view</Text>
        )}
      </View>

      {/* Right chevron */}
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    minHeight: 80,
    gap: 10,
  },
  checkWrap: { width: 26, alignItems: "center" },

  imgWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  imgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  textWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#111" },
  titleDone: { color: "#9CA3AF", textDecorationLine: "line-through" },
  protocol: { fontSize: 13, color: "#6B7280", marginTop: 3 },
});
