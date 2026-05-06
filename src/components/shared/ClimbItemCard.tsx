// src/components/shared/ClimbItemCard.tsx
// Card row used by daily-summary, journal logs, and other surfaces to
// display a single climb. Accepts either a raw LocalDayLogItem or an
// AggregatedClimbItem (Window DAILY_GROUP) — the latter folds multiple
// attempts/sends on one route into a single card with combined counts.
import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import { getColorForGrade } from "../../../lib/gradeColors";
import type {
  AggregatedClimbItem,
  AggregatedStyle,
  LocalDayLogItem,
} from "../../features/journal/loglist/types";

type CardItem = LocalDayLogItem | AggregatedClimbItem;

interface ClimbItemCardProps {
  item: CardItem;
  onPress: () => void;
  /** When true, suppress edit/navigation affordances. The card still
   *  renders the row content but doesn't react to taps and hides the
   *  chevron — used when viewing another user's daily summary. */
  readOnly?: boolean;
}

function isAggregated(item: CardItem): item is AggregatedClimbItem {
  return (item as AggregatedClimbItem).routeKey !== undefined;
}

function styleLabel(style: AggregatedStyle | string | undefined): string {
  switch (style) {
    case "flash":
      return "Flash";
    case "onsight":
      return "Onsight";
    case "redpoint":
      return "Redpoint";
    case "attempt":
      return "Attempted";
    default:
      return "";
  }
}

type CardView = {
  name: string;
  grade: string;
  type: LocalDayLogItem["type"];
  style: AggregatedStyle | string | undefined;
  sendCount: number;
  attemptsTotal: number;
  note: string;
  thumbUri: string;
  isAttemptOnly: boolean;
};

function toView(item: CardItem): CardView {
  if (isAggregated(item)) {
    const thumb = item.media?.[0];
    const thumbUri =
      thumb?.type === "video"
        ? thumb.coverUri || thumb.uri
        : thumb?.uri || "";
    return {
      name: item.name,
      grade: item.grade,
      type: item.type,
      style: item.style,
      sendCount: item.sendCount,
      attemptsTotal: item.attemptsTotal,
      note: (item.note || "").trim(),
      thumbUri,
      isAttemptOnly: item.style === "attempt",
    };
  }
  const thumb = item.media?.[0];
  const thumbUri =
    thumb?.type === "video"
      ? thumb.coverUri || thumb.uri
      : thumb?.uri || item.imageUri || "";
  const sendCount = item.sendCount ?? 0;
  const attemptsTotal = item.attemptsTotal ?? item.attempts ?? 1;
  return {
    name: item.name,
    grade: item.grade,
    type: item.type,
    style: item.style,
    sendCount,
    attemptsTotal,
    note: (item.note || "").trim(),
    thumbUri,
    isAttemptOnly: sendCount === 0,
  };
}

/** Build the meta row segments. For aggregated rows with multiple sends or
 *  attempts, surface the multiplier so users see "Sent 3x · 5 attempts"
 *  rather than a single redpoint pill. */
function metaSegments(view: CardView): { label: string; tone: "send" | "attempt" }[] {
  const out: { label: string; tone: "send" | "attempt" }[] = [];
  if (view.isAttemptOnly) {
    const label = view.attemptsTotal > 1
      ? `Attempted · ${view.attemptsTotal}x`
      : "Attempted";
    out.push({ label, tone: "attempt" });
    return out;
  }
  const styleText = styleLabel(view.style);
  if (styleText) {
    const sendSuffix = view.sendCount > 1 ? ` · ${view.sendCount}x` : "";
    out.push({ label: `${styleText}${sendSuffix}`, tone: "send" });
  }
  if (view.attemptsTotal > view.sendCount) {
    out.push({
      label: `${view.attemptsTotal} attempts`,
      tone: "attempt",
    });
  }
  return out;
}

export default function ClimbItemCard({ item, onPress, readOnly = false }: ClimbItemCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const view = toView(item);
  const routeName = view.name.trim();
  const gc = getColorForGrade(view.grade);
  const segments = metaSegments(view);
  const hasThumb = !!view.thumbUri;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={readOnly ? undefined : onPress}
      activeOpacity={readOnly ? 1 : 0.7}
      disabled={readOnly}
    >
      {/* Left thumbnail - always visible */}
      <View style={styles.thumbContainer}>
        {hasThumb ? (
          <Image
            source={{ uri: view.thumbUri }}
            style={styles.thumb}
            contentFit="cover"
          />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons
              name={view.isAttemptOnly ? "sync-outline" : "camera-outline"}
              size={20}
              color={view.isAttemptOnly ? colors.attempt : colors.textTertiary}
            />
          </View>
        )}
      </View>

      <View style={styles.content}>
        {/* Title row - route name in large text */}
        <Text style={styles.title} numberOfLines={1}>
          {routeName || view.grade}
        </Text>

        {/* Subtitle row - grade dot + grade + style segments */}
        <View style={styles.subtitleRow}>
          <View style={[styles.gradeDot, { backgroundColor: gc }]} />
          <Text style={styles.gradeText}>{view.grade}</Text>
          {segments.map((seg, idx) => (
            <View key={`${seg.tone}-${idx}`} style={styles.segWrap}>
              <Text style={styles.separator}>·</Text>
              <Text
                style={[
                  styles.metaText,
                  seg.tone === "attempt" && { color: colors.attempt, fontWeight: "700" },
                ]}
              >
                {seg.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Optional note */}
        {view.note ? (
          <Text style={styles.noteText} numberOfLines={1}>
            {view.note}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      {!readOnly && (
        <View style={styles.chevron}>
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 0.6,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  thumbContainer: {
    width: 64,
    height: 64,
  },
  thumb: {
    width: 64,
    height: 64,
  },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  segWrap: { flexDirection: "row", alignItems: "center" },
  gradeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  separator: {
    fontSize: 12,
    color: colors.textTertiary,
    marginHorizontal: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  noteText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: "500",
  },
  chevron: {
    paddingRight: 12,
    justifyContent: "center",
  },
});
