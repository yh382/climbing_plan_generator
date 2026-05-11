// src/components/shared/ClimbItemCard.tsx
// Card row used by daily-summary, journal-today, the user-ascents page,
// and other surfaces to display a single climb. Two variants share one
// component to keep the visual shorthand (grade dot, feel pill, note
// row) in one place:
//
//   - 'aggregated' (default) — collapses multiple attempts/sends on one
//     route into a single row. Used by daily-summary + user-ascents.
//   - 'single' — renders one raw LocalDayLogItem with a larger thumb,
//     StyleBadge icon, optional FeelPill, and an external note bubble.
//     Used by journal-today's TodayDetailsList; replaces the legacy
//     LogItemCard component (deleted in Window D1_D2_E2).
import { memo, useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import { getColorForGrade } from "../../../lib/gradeColors";
import type {
  AggregatedClimbItem,
  AggregatedStyle,
  Feel,
  LocalDayLogItem,
} from "../../features/journal/loglist/types";

type CardItem = LocalDayLogItem | AggregatedClimbItem;
export type ClimbItemCardVariant = "aggregated" | "single";

interface ClimbItemCardProps {
  item: CardItem;
  onPress: () => void;
  /** When true, suppress edit/navigation affordances. The card still
   *  renders the row content but doesn't react to taps and hides the
   *  chevron — used when viewing another user's daily summary. */
  readOnly?: boolean;
  /** Layout variant. Defaults to ``'aggregated'``. */
  variant?: ClimbItemCardVariant;
  /** Force-show / hide the FeelPill. Defaults: visible on the
   *  ``'single'`` variant, hidden on ``'aggregated'``. */
  showFeel?: boolean;
  /** Used only by the ``'single'`` variant when the thumbnail is empty
   *  — renders the grade label as a placeholder. */
  labelOf?: (grade: string) => string;
  /** Used only by the ``'single'`` variant for "{n} 次" subtitle and
   *  the "Unnamed Route" fallback. Falls back to English literals when
   *  not provided. */
  tr?: (zh: string, en: string) => string;
  /** ``'single'`` variant only — note text rendered in the bubble below
   *  the card. The bubble is hidden when this is empty. */
  note?: string;
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
  feel: Feel;
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
      feel: item.feel,
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
    feel: item.feel,
    note: (item.note || "").trim(),
    thumbUri,
    isAttemptOnly: sendCount === 0,
  };
}

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

function defaultTr(_zh: string, en: string): string {
  return en;
}

function FeelPill({
  feel,
  pillBg,
  pillFg,
}: {
  feel: Feel;
  pillBg: string;
  pillFg: string;
}) {
  if (feel === "solid") return null;
  const text = feel === "soft" ? "SOFT" : "HARD";
  return (
    <View style={[singleStatic.feelPill, { backgroundColor: pillBg }]}>
      <Text style={[singleStatic.feelPillText, { color: pillFg }]}>{text}</Text>
    </View>
  );
}

function StyleBadge({
  style,
  color,
}: {
  style: LocalDayLogItem["style"] | AggregatedStyle | string | undefined;
  color: string;
}) {
  const isBolt = style === "flash" || style === "onsight";
  const label =
    style === "flash"
      ? "Flash"
      : style === "onsight"
      ? "Onsight"
      : "Send";
  return (
    <View style={singleStatic.styleRow}>
      <Ionicons
        name={isBolt ? "flash-outline" : "checkmark-circle-outline"}
        size={14}
        color={color}
      />
      <Text style={[singleStatic.metaText, { color }]}>{label}</Text>
    </View>
  );
}

function ClimbItemCardComponent(props: ClimbItemCardProps) {
  const {
    item,
    onPress,
    readOnly = false,
    variant = "aggregated",
    showFeel,
    labelOf,
    tr = defaultTr,
    note: noteOverride,
  } = props;

  const colors = useThemeColors();
  const aggregatedStyles = useMemo(() => createAggregatedStyles(colors), [colors]);
  const singleStyles = useMemo(() => createSingleStyles(colors), [colors]);

  const view = toView(item);
  const routeName = view.name.trim();
  const gc = getColorForGrade(view.grade);

  if (variant === "single") {
    const note = (noteOverride ?? view.note).trim();
    const displayName = routeName || tr("未命名路线", "Unnamed Route");
    const attemptsShown = view.attemptsTotal;
    const subtitleAttempts = `${attemptsShown} ${tr("次", "attempts")}`;
    const showFeelPill = showFeel ?? true;

    return (
      <View style={{ paddingHorizontal: 3 }}>
        <TouchableOpacity
          activeOpacity={readOnly ? 1 : 0.9}
          onPress={readOnly ? undefined : onPress}
          disabled={readOnly}
          style={singleStyles.card}
        >
          <View style={singleStatic.imageWrap}>
            {view.thumbUri ? (
              <Image
                source={{ uri: view.thumbUri }}
                style={singleStatic.image}
                contentFit="cover"
              />
            ) : (
              <View style={[singleStatic.image, singleStyles.noImage]}>
                <Text style={singleStyles.noImageText}>
                  {labelOf ? labelOf(view.grade) : view.grade}
                </Text>
              </View>
            )}
          </View>
          <View style={singleStatic.info}>
            <View style={singleStatic.topRow}>
              <Text style={singleStyles.routeName} numberOfLines={1}>
                {displayName}
              </Text>
              {showFeelPill && (
                <FeelPill
                  feel={view.feel}
                  pillBg={colors.pillBackground}
                  pillFg={colors.pillText}
                />
              )}
            </View>
            <View style={singleStatic.metaRow}>
              <StyleBadge style={view.style} color={colors.chartLabel} />
              <Text style={[singleStatic.metaDot, { color: colors.border }]}>
                •
              </Text>
              <Text style={[singleStatic.metaText, { color: colors.chartLabel }]}>
                {subtitleAttempts}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {note ? (
          <View style={singleStyles.noteBubble}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={14}
              color={colors.chartLabel}
            />
            <Text style={singleStyles.noteText} numberOfLines={2}>
              {note}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  // ── 'aggregated' variant ─────────────────────────────────────────
  const segments = metaSegments(view);
  const hasThumb = !!view.thumbUri;
  const showFeelPill = showFeel ?? false;

  return (
    <TouchableOpacity
      style={aggregatedStyles.card}
      onPress={readOnly ? undefined : onPress}
      activeOpacity={readOnly ? 1 : 0.7}
      disabled={readOnly}
    >
      <View style={aggregatedStyles.thumbContainer}>
        {hasThumb ? (
          <Image
            source={{ uri: view.thumbUri }}
            style={aggregatedStyles.thumb}
            contentFit="cover"
          />
        ) : (
          <View style={aggregatedStyles.thumbPlaceholder}>
            <Ionicons
              name={view.isAttemptOnly ? "sync-outline" : "camera-outline"}
              size={20}
              color={view.isAttemptOnly ? colors.attempt : colors.textTertiary}
            />
          </View>
        )}
      </View>

      <View style={aggregatedStyles.content}>
        <View style={aggregatedStyles.titleRow}>
          <Text style={aggregatedStyles.title} numberOfLines={1}>
            {routeName || view.grade}
          </Text>
          {showFeelPill && (
            <FeelPill
              feel={view.feel}
              pillBg={colors.pillBackground}
              pillFg={colors.pillText}
            />
          )}
        </View>

        <View style={aggregatedStyles.subtitleRow}>
          <View style={[aggregatedStyles.gradeDot, { backgroundColor: gc }]} />
          <Text style={aggregatedStyles.gradeText}>{view.grade}</Text>
          {segments.map((seg, idx) => (
            <View key={`${seg.tone}-${idx}`} style={aggregatedStyles.segWrap}>
              <Text style={aggregatedStyles.separator}>·</Text>
              <Text
                style={[
                  aggregatedStyles.metaText,
                  seg.tone === "attempt" && {
                    color: colors.attempt,
                    fontWeight: "700",
                  },
                ]}
              >
                {seg.label}
              </Text>
            </View>
          ))}
        </View>

        {view.note ? (
          <Text style={aggregatedStyles.noteText} numberOfLines={1}>
            {view.note}
          </Text>
        ) : null}
      </View>

      {!readOnly && (
        <View style={aggregatedStyles.chevron}>
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const ClimbItemCard = memo(ClimbItemCardComponent);
ClimbItemCard.displayName = "ClimbItemCard";
export default ClimbItemCard;

// ── Static styles for 'single' variant (no theme dependency) ─────
const singleStatic = StyleSheet.create({
  imageWrap: { width: 76, height: 76 },
  image: { width: "100%", height: "100%" },
  styleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  info: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  metaText: { fontSize: 12, fontWeight: "800" },
  metaDot: { marginHorizontal: 6, fontSize: 12, fontWeight: "900" },
  feelPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  feelPillText: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
});

const createSingleStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.background,
      borderRadius: 12,
      borderWidth: 0.4,
      borderColor: c.cardBorder,
      flexDirection: "row",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
    },
    noImage: {
      backgroundColor: c.cardDarkImage,
      alignItems: "center",
      justifyContent: "center",
    },
    noImageText: {
      fontSize: 14,
      fontFamily: "DMMono_500Medium",
      color: c.textSecondary,
    },
    routeName: {
      flex: 1,
      fontSize: 15,
      fontFamily: "DMSans_900Black",
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    noteBubble: {
      marginTop: 8,
      backgroundColor: c.backgroundSecondary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    noteText: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },
  });

const createAggregatedStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 12,
      flexDirection: "row",
      // stretch so the content side fills the thumb-defined 80px height
      // (no centering gap when the note is absent).
      alignItems: "stretch",
      // Forces card height ≥ thumb height (80). Content padding is tuned
      // below so natural content height stays ≤ 80 → card is exactly 80,
      // thumb fills it edge-to-edge with no gap.
      minHeight: 80,
      overflow: "hidden",
      borderWidth: 0.6,
      borderColor: colors.cardBorder,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    // Fixed 80×80. Earlier attempt left height implicit + relied on
    // alignItems:'stretch' to fill, but expo-image with width/height:'100%'
    // in a height-undefined parent fell back to the image's intrinsic
    // dimensions (often 1080×1920) and exploded the card vertically.
    thumbContainer: {
      width: 80,
      height: 80,
      // Right corners rounded to mirror the card's left corners — thumb
      // reads as a self-contained rounded square at the card's leading
      // edge. Left corners are clipped by the card's overflow:hidden.
      borderTopRightRadius: 12,
      borderBottomRightRadius: 12,
      overflow: "hidden",
    },
    thumb: {
      width: 80,
      height: 80,
    },
    thumbPlaceholder: {
      width: 80,
      height: 80,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 3,
      justifyContent: "center",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    title: {
      flex: 1,
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

// Avoid stranded `theme` import warnings — re-exported for downstream
// surfaces that still import from this module.
export { theme };
