// src/features/community/events/EventDetailScreen.tsx
import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  Pressable,
} from "react-native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
} from "react-native-reanimated";

import { HeaderButton } from "@/components/ui/HeaderButton";
import { HeroCover } from "@/components/shared/HeroCover";
import CategoryChip from "./component/CategoryChip";
import EventDynamicCards from "./component/EventDynamicCards";
import EventDetailsModal from "./EventDetailsModal";

import { useEventDetailData } from "./data/useEventDetailData";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
// === Constants (Align with Challenge) ===
const COVER_H = 280;
const THUMB_SIZE = 52;
const SIDE_PADDING = 12;

// === Helper Functions ===
function formatYMD(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function formatTimeHM(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Signed day diff — negative means the event is over (★2: ended events must
// say "Ended", not "0 days left").
function daysLeft(endISO?: string) {
  if (!endISO) return null;
  const end = new Date(endISO);
  if (Number.isNaN(end.getTime())) return null;

  const now = new Date();
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((endUTC - nowUTC) / (1000 * 60 * 60 * 24));
}

// === Components (Align with Challenge Style) ===

// 极简信息行 (Lightweight InfoRow)
function InfoRow({
  icon,
  children,
  right,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  right?: React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Content = (
    <View style={[styles.infoRow as ViewStyle, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={22} color={colors.textSecondary} />
      </View>
      <View style={styles.infoContent}>
        <View style={{ flex: 1, paddingRight: 8, justifyContent: "center" }}>
          {children}
        </View>
        {right ? <View style={styles.infoRight}>{right}</View> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        {Content}
      </Pressable>
    );
  }
  return Content;
}

export default function EventDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const { event, eventRaw, onToggleJoin, joined, loading } = useEventDetailData();
  const { tr } = useSettings();
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ===== Scroll Animation — hooks must be before early return =====
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((evt) => {
    scrollY.value = evt.contentOffset.y;
  });

  const coverParallaxStyle = useAnimatedStyle(() => {
    const adjustedScrollY = scrollY.value + headerHeight;
    if (adjustedScrollY >= 0) return {};
    const absScroll = -adjustedScrollY;
    return {
      transform: [
        // Clamp pull-to-zoom so a hard drag can't blow the cover past bounds.
        { scale: Math.min(1 + absScroll / COVER_H, 1.4) },
        { translateY: adjustedScrollY / 2 },
      ],
    };
  });

  // ===== Text Derivations =====
  const startText = useMemo(
    () => (event ? formatYMD(event.startDateISO) : ""),
    [event?.startDateISO]
  );
  const endText = useMemo(
    () => (event ? formatYMD(event.endDateISO) : ""),
    [event?.endDateISO]
  );
  const left = useMemo(
    () => (event ? daysLeft(event.endDateISO ?? event.startDateISO) : null),
    [event?.endDateISO, event?.startDateISO]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: HEADER_TRANSPARENT,
      headerTitle: "",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      headerRight: () => <HeaderButton icon="square.and.arrow.up" onPress={() => {}} />,
      scrollEdgeEffects: { top: 'soft' },
    });
  }, [navigation, router, event]);

  // Loading / not found states
  if (loading || !event) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#9CA3AF" />
      </View>
    );
  }

  // Thumbnail logic — use publisher logo if available
  const thumb = eventRaw?.publisher?.logoUrl
    ? { uri: eventRaw.publisher.logoUrl }
    : undefined;

  const hasRange =
    !!event.endDateISO && event.endDateISO !== event.startDateISO;
  const dateLine = hasRange ? `${startText} - ${endText}` : `${startText}`;

  const timeLine = event.startTimeISO
    ? `${formatTimeHM(event.startTimeISO)}${
        event.endTimeISO ? ` - ${formatTimeHM(event.endTimeISO)}` : ""
      }`
    : "";

  const showDate = event.display?.showDate !== false;
  const showTime = event.display?.showTime === true;
  const showLocation = event.display?.showLocation !== false;
  const showRewards = event.display?.showRewards === true;

  // W2 registration details (from the raw EventOut.details + spots_left).
  const det = eventRaw?.details ?? null;
  const cap = det?.capacity ?? null;
  const spots = eventRaw?.spots_left ?? null;
  const fmtPrice = (cents?: number | null) =>
    cents == null ? null : cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
  const memberP = fmtPrice(det?.member_price_cents);
  const nonMemberP = fmtPrice(det?.nonmember_price_cents);
  const priceLine =
    memberP || nonMemberP
      ? [
          memberP ? `Members ${memberP}` : null,
          nonMemberP ? `Non-members ${nonMemberP}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Hero Area ===== */}
        <View style={styles.heroWrap}>
          <Animated.View style={[coverParallaxStyle, { marginTop: -headerHeight, overflow: "hidden" }]}>
            <View style={[styles.coverWrap, { height: COVER_H }]}>
              <HeroCover coverUrl={eventRaw?.cover_url ?? null} />
            </View>
          </Animated.View>

          {/* Reserve layout height below the cover for the floating row. */}
          <View style={styles.organizerSpacer} />

          {/* Floating organizer row — avatar + a two-line column (Hosted by /
              category chip), both vertically centered on the avatar, straddling
              the cover's resting bottom. */}
          <View style={[styles.organizerRow, { top: COVER_H - THUMB_SIZE / 2 - headerHeight }]}>
            <View style={styles.thumbOuter}>
              {thumb ? (
                <Image source={thumb} style={styles.thumbImg} resizeMode="cover" />
              ) : (
                <View
                  style={[
                    styles.thumbImg,
                    { backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <Ionicons name="home" size={20} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View style={styles.organizerCol}>
              <Text style={styles.organizerOneLine} numberOfLines={1}>
                <Text style={styles.organizerPrefix}>Hosted by </Text>
                {event.organizerName}
              </Text>
              {event.tags && event.tags.length > 0 ? (
                <View style={styles.organizerChips}>
                  {event.tags.slice(0, 3).map((t) => (
                    <CategoryChip key={t} text={t} size="sm" />
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ===== Main Content ===== */}
        <View style={styles.mainBlock}>
          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Join Button */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.joinBtn, joined && styles.joinBtnJoined]}
            onPress={onToggleJoin}
          >
            <Text style={styles.joinBtnText}>
              {joined ? "Joined" : "Join Event"}
            </Text>
          </TouchableOpacity>

          {/* Info Rows (Clean Style) */}
          <View style={styles.infoListContainer}>
            {/* Date Row */}
            {showDate ? (
              <InfoRow
                icon="calendar-clear-outline"
                isLast={!showTime && !showLocation && !showRewards && !event.description}
                right={
                  left !== null ? (
                    <Text style={styles.pillText}>
                      {left < 0
                        ? tr("已结束", "Ended")
                        : tr(`剩 ${left} 天`, `${left} days left`)}
                    </Text>
                  ) : null
                }
              >
                <Text style={styles.infoValue}>
                  {dateLine}
                  {showTime && timeLine ? ` · ${timeLine}` : ""}
                </Text>
              </InfoRow>
            ) : null}

            {/* Location Row */}
            {showLocation ? (
              <InfoRow
                icon="location-outline"
                isLast={!showRewards && !event.description}
              >
                <View>
                  <Text style={styles.infoValue}>
                    {event.locationName ?? "Location TBD"}
                  </Text>
                  {event.locationDetail ? (
                    <Text style={styles.infoSubValue}>
                      {event.locationDetail}
                    </Text>
                  ) : null}
                </View>
              </InfoRow>
            ) : null}

            {/* Capacity / spots (W2) */}
            {cap != null ? (
              <InfoRow icon="people-outline" isLast={false}>
                <Text style={styles.infoValue}>
                  {(spots ?? 0) <= 0 ? "Full" : `${spots} spots left`}
                  {` · cap ${cap}`}
                </Text>
              </InfoRow>
            ) : null}

            {/* Price (W2) */}
            {priceLine ? (
              <InfoRow icon="pricetag-outline" isLast={false}>
                <Text style={styles.infoValue}>{priceLine}</Text>
              </InfoRow>
            ) : null}

            {/* Rewards Row */}
            {showRewards && event.rewardsLine ? (
              <InfoRow icon="trophy-outline" isLast={!event.description}>
                <Text style={styles.infoValue}>{event.rewardsLine}</Text>
              </InfoRow>
            ) : null}

            {/* Description Row (Clickable) */}
            {event.description ? (
              <InfoRow
                icon="information-circle-outline"
                isLast
                onPress={() => setDetailsOpen(true)}
                right={
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                }
              >
                <Text style={styles.infoValue} numberOfLines={2}>
                  {event.description}
                </Text>
                <Text style={styles.infoSubValue}>View details</Text>
              </InfoRow>
            ) : null}
          </View>
        </View>

        {/* ===== Bottom Dynamic Cards (Styled like Leaderboard Card) ===== */}
        {event.cards && event.cards.length > 0 && (
          <View style={styles.bottomCardContainer}>
            <View style={styles.bottomCardSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Highlights</Text>
              </View>
              <EventDynamicCards cards={event.cards} />
            </View>
          </View>
        )}
      </Animated.ScrollView>
      <EventDetailsModal
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Event details"
        text={event.description ?? ""}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // === Hero ===
  heroWrap: { position: "relative" },
  coverWrap: { width: "100%" },
  // Spacer reserving room below the cover for the floating organizer row
  // (avatar bottom half + a little breathing room).
  organizerSpacer: { height: THUMB_SIZE / 2 + 16, backgroundColor: colors.background },

  // Floating organizer row: avatar + (Hosted by / chip) column, centered so the
  // two text lines' combined height aligns with the avatar.
  organizerRow: {
    position: "absolute",
    left: SIDE_PADDING,
    right: SIDE_PADDING,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  organizerCol: { flex: 1, justifyContent: "center", gap: 5 },
  organizerOneLine: { fontSize: 14, fontFamily: theme.fonts.bold, color: colors.textPrimary },
  organizerPrefix: { fontFamily: theme.fonts.regular, color: colors.textSecondary },
  organizerChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  thumbOuter: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbImg: {
    width: THUMB_SIZE - 5,
    height: THUMB_SIZE - 5,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },

  // === Main Content ===
  mainBlock: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 8,
  },
  title: {
    fontSize: 34,
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.6,
    marginBottom: 20,
    marginTop: -10,
    lineHeight: 38,
  },

  // Join Button
  joinBtn: {
    height: 52,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: colors.cardDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  joinBtnJoined: {
    backgroundColor: colors.accent,
  },
  joinBtnText: { fontSize: 17, fontFamily: theme.fonts.bold, color: "#FFFFFF" },

  // Info List
  infoListContainer: {
    marginTop: 0,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconWrap: {
    width: 28,
    alignItems: "center",
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoRight: { marginLeft: 8 },

  // Info Text Styles
  infoValue: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  infoSubValue: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pillText: {
    fontSize: 12,
    fontFamily: theme.fonts.monoMedium,
    color: "#FFFFFF",
    backgroundColor: colors.cardDark,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
  },

  // === Bottom Card Section ===
  bottomCardContainer: {
    paddingHorizontal: SIDE_PADDING,
    marginTop: 10,
  },
  bottomCardSection: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.card,
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
  },
});