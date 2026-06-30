// src/components/shared/ProfileHeader.tsx
// Window β — Profile KAYA: cover + id-block 左下 + action FAB 右下。
// floating pills (⚙ ↗ ⋯) + back-pill 由 screen 的 Stack.Toolbar / Stack.Screen 处理，
// 不在 ProfileHeader 内。

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import ProfileAffiliations, {
  isStaff,
} from "@/features/orgs/components/ProfileAffiliations";
import type { Affiliation } from "@/features/orgs/types";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import ProfileStatsFloatingCard from "@/components/shared/ProfileStatsFloatingCard";
import GlassFill from "@/components/ui/GlassFill";

// Window BY — visible cover height bumped 300 → 370 (+70) to host the 4-up
// stats glass card at the cover's bottom, above the sub tab bar, fully inside
// the fixed-chrome hero's visible bounds (no clip, no tab-bar overlap).
const PROFILE_COVER_VISIBLE = 370;
// Content-shell overlaps cover by 24pt with rounded top corners. The cut-out
// corners need to reveal cover *image* (not the ScrollView's white bg behind
// the sibling shell), so the cover container is taller than its visible area
// — bg fills the full extended height; id-block / FABs are anchored relative
// to the visible bottom, so we offset by COVER_OVERLAP.
const COVER_OVERLAP = 35;
const PROFILE_COVER_H = PROFILE_COVER_VISIBLE + COVER_OVERLAP;
// Window BY — stats card sits ~14pt above the visible cover bottom (= sub tab
// bar's rest line); id-block + Edit pill ride the band above the card.
const STATS_CARD_HEIGHT = 60;
// +8 (was +14) — tighter gap to the sub tab bar so the rest-state band reads
// as one field (BY seam polish).
const STATS_CARD_BOTTOM = COVER_OVERLAP + 8;
const ID_BLOCK_BOTTOM = STATS_CARD_BOTTOM + STATS_CARD_HEIGHT + 14;
const ACTION_FAB_BOTTOM = ID_BLOCK_BOTTOM;

// Exported so the sticky tab bar spacer (in profile screens) can replicate
// the cover's bottom slice — see ProfileCoverArt below.
export const PROFILE_COVER_HEIGHT_FULL = PROFILE_COVER_H;
export const PROFILE_COVER_OVERLAP_PT = COVER_OVERLAP;

// BY-spike Item 1 — convert theme bg hex (#F4F3F2 / #000000) to "r,g,b" so the
// cover-fade gradient can land on the exact background color at its bottom stop
// (渐白 in light, 渐黑 in dark — never a hardcoded white).
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

// Default cover gradients when no cover image set.
const DEFAULT_GRADIENT_LIGHT: [string, string, string] = [
  "#7A9E8E",
  "#A8C0B4",
  "#C8D4C8",
];
const DEFAULT_GRADIENT_DARK: [string, string, string] = [
  "#2C2C2E",
  "#1C1C1E",
  "#000000",
];

/**
 * Standalone cover background renderer — Image + gradient overlay when
 * `coverUrl` is provided, default diagonal gradient otherwise. Fills its
 * parent via `StyleSheet.absoluteFill`, so the caller controls the box.
 *
 * Used in two places: (1) the parallax-transformed cover inside this
 * component; (2) a 35pt-tall "fake cover slice" rendered inside the
 * sticky-tab-bar spacer in profile screens, so the spacer's overlap
 * area visually matches the real cover even when the absolute-overlay
 * bar lags against native scroll.
 */
export function ProfileCoverArt({ coverUrl }: { coverUrl: string | null }) {
  const isDark = useColorScheme() === "dark";
  const defaultGradient = isDark ? DEFAULT_GRADIENT_DARK : DEFAULT_GRADIENT_LIGHT;
  if (coverUrl) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: coverUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"]}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }
  return (
    <LinearGradient
      colors={defaultGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

export type ProfileHeaderViewMode = "self" | "other";

export interface ProfileHeaderProps {
  name: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  homeGym: string | null;
  followersCount: number;
  followingCount: number;
  viewMode: ProfileHeaderViewMode;
  isFollowing?: boolean;
  followLoading?: boolean;
  msgLoading?: boolean;
  onEditPress?: () => void;
  onFollowPress?: () => void;
  onMessagePress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  scrollY?: SharedValue<number>;
  /** Window BY — 4-up stats glass card (B Best / R Best / Sends / Sessions).
   *  Formerly a 2-up pill fed a joined `gradeText`; now split so the card can
   *  render each grade in its own cell. */
  boulderGrade?: string;
  routeGrade?: string;
  totalSends?: number;
  /** Window BY — session count (kpis.sessionCount). Other-user omits → "—". */
  totalSessions?: number;
  /** Window BY — tap callback for the stats card (→ ascents history). */
  onKPIPress?: () => void;
  /**
   * Window BX — when true (default, legacy ScrollView-child usage) the cover
   * pulls itself up by headerHeight to cancel the ScrollView's automatic
   * content inset and the parallax baseline is offset by headerHeight. When
   * false (mounted inside ProfileChromeRoot's absolute hero overlay, which
   * already sits at screen top with no content inset) neither offset applies.
   */
  bleedUnderHeader?: boolean;
  /** P2-A — verified gym affiliations (avatar check + collapsible row). */
  affiliations?: Affiliation[];
}

export default function ProfileHeader({
  name,
  username,
  avatarUrl,
  coverUrl,
  bio,
  homeGym,
  followersCount,
  followingCount,
  viewMode,
  isFollowing,
  followLoading,
  msgLoading,
  onEditPress,
  onFollowPress,
  onMessagePress,
  onFollowersPress,
  onFollowingPress,
  scrollY,
  boulderGrade,
  routeGrade,
  totalSends,
  totalSessions,
  onKPIPress,
  bleedUnderHeader = true,
  affiliations,
}: ProfileHeaderProps) {
  const colors = useThemeColors();
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasStaff = useMemo(
    () => (affiliations ?? []).some(isStaff),
    [affiliations],
  );

  // The screen sets `headerTransparent: true` + `contentInsetAdjustmentBehavior:
  // "automatic"`, so the ScrollView prepends headerHeight worth of top padding.
  // Pull the cover back up by that amount so it actually extends edge-to-edge
  // behind the status bar / nav bar (mockup shows status bar overlaying cover).
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight() || (insets.top + 44);
  // BX — inside ProfileChromeRoot's hero overlay there is no automatic
  // content inset, so the parallax rest position is 0 (not -headerHeight).
  const parallaxOffset = bleedUnderHeader ? headerHeight : 0;

  // Parallax: scroll up enlarges + translates the cover background.
  // scrollY is reported relative to the ScrollView's content origin; with
  // `contentInsetAdjustmentBehavior="automatic"` the rest position is
  // `-headerHeight`, not 0. Add headerHeight back so transform = identity
  // at rest (otherwise cover image gets zoomed in by ~30% on first paint —
  // visible as "放大裁切").
  const bgParallaxStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const adjusted = scrollY.value + parallaxOffset;
    if (adjusted >= 0) return {};
    const absScroll = -adjusted;
    return {
      transform: [
        { scale: 1 + absScroll / PROFILE_COVER_H },
        { translateY: adjusted / 2 },
      ],
    };
  });

  // BY-spike Item 1 — cover fade-to-bg overlay. Fixed (non-parallax) so the
  // bottom stop stays anchored to the content seam while the image scrolls
  // underneath. Bottom stop = exact theme bg so cover dissolves into content.
  const bgRgb = useMemo(() => hexToRgb(colors.background), [colors.background]);
  // Window BY — the gradient must reach FULL bg before the hero's clip point so
  // the *visible* cover bottom is pure bg and connects seamlessly with the
  // (opaque-bg) sub tab bar below it. The hero clips at heroHeight/cover ≈
  // 370/405 ≈ 0.914, so a full-bg stop at 1.0 would leave the visible bottom at
  // ~0.97 bg (≈3% photo bleeding through → the seam). Land full bg at 0.88
  // instead → the last visible band is solid bg = exact bar color. No layers,
  // no architecture change; this is the whole "seam" fix.
  // Even, linear fade-to-bg: a mild dark wash up top (white id-block text), then
  // a CLEAN bg-alpha ramp 0 → 1 in equal steps (0.25 each) from 0.48 → 0.88.
  // No black→bg color flip mid-gradient (that produced a muddy grey band + the
  // "sudden coverage" jump); full bg lands at 0.88, before the hero clip
  // (~0.914), so the visible bottom is solid bg and joins the bar seamlessly.
  const coverFadeColors = useMemo(
    () =>
      [
        "rgba(0,0,0,0.10)",
        "rgba(0,0,0,0.10)",
        `rgba(${bgRgb},0)`,
        `rgba(${bgRgb},0.25)`,
        `rgba(${bgRgb},0.5)`,
        `rgba(${bgRgb},0.75)`,
        colors.background,
        colors.background,
      ] as const,
    [bgRgb, colors.background],
  );
  const coverFadeLocations = [0, 0.3, 0.48, 0.58, 0.68, 0.78, 0.88, 1] as const;

  const bioText = bio?.trim() || "";
  const homeGymText = homeGym?.trim() || "";
  const subtitle = homeGymText
    ? `@${username} · 📍 ${homeGymText}`
    : `@${username}`;
  const showBio = bioText.length > 0;

  return (
    <View
      // BX — as an absolute hero overlay (ProfileChromeRoot) the cover sits
      // OVER the page scroller. box-none lets vertical drags fall through to
      // the scroll view (so you can scroll by dragging the cover) while the
      // Edit / Follow / KPI buttons below still receive taps.
      pointerEvents="box-none"
      style={[
        styles.cover,
        // Lift cover under nav bar + status bar so background bleeds to top
        // edge. Total cover height stays PROFILE_COVER_H — id-block / FAB at
        // bottom: 22 are anchored to visible bottom (not far off the screen).
        // BX — skipped when rendered inside the hero overlay (already at top).
        bleedUnderHeader ? { marginTop: -headerHeight } : null,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, bgParallaxStyle, { overflow: "hidden" }]}
      >
        <ProfileCoverArt coverUrl={coverUrl} />
      </Animated.View>

      {/* Window BY — cover fade-to-bg overlay (even linear LinearGradient).
          Sits above the parallax cover, below id-block. Reaches full bg before
          the hero clip so the visible bottom is solid bg and joins the sub tab
          bar seamlessly. (BY-spike blur variant dropped — on-device it showed
          no visible gain over the gradient.) */}
      <LinearGradient
        pointerEvents="none"
        colors={coverFadeColors}
        locations={coverFadeLocations}
        style={StyleSheet.absoluteFill}
      />

      {/* Identity block: avatar + name + handle + bio + counts (bottom-left) */}
      <View style={styles.idBlock} pointerEvents="box-none">
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={36} color="#9CA3AF" />
            </View>
          )}
          {hasStaff ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        {showBio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {bioText}
          </Text>
        ) : null}
        <ProfileAffiliations affiliations={affiliations ?? []} />
        <View style={styles.countsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${followersCount} followers`}
            onPress={onFollowersPress}
            disabled={!onFollowersPress}
            hitSlop={6}
          >
            <Text style={styles.counts}>
              <Text style={styles.countsNum}>{followersCount}</Text>
              {" followers"}
            </Text>
          </Pressable>
          <Text style={styles.countsSep}>·</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${followingCount} following`}
            onPress={onFollowingPress}
            disabled={!onFollowingPress}
            hitSlop={6}
          >
            <Text style={styles.counts}>
              <Text style={styles.countsNum}>{followingCount}</Text>
              {" following"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Window BY — 4-up stats glass card, anchored at the cover bottom above
          the sub tab bar. Child of the cover (within the visible region, so
          not clipped by overflow:hidden); floats over the 渐白 fade band. */}
      <ProfileStatsFloatingCard
        style={styles.statsCard}
        boulderGrade={boulderGrade}
        routeGrade={routeGrade}
        totalSends={totalSends}
        totalSessions={totalSessions}
        onPress={onKPIPress}
      />

      {/* Action FAB (bottom-right) — Edit glass ghost pill (BY: theme-tokened
          via GlassFill; black icon/text on light, white on dark). */}
      {viewMode === "self" ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={onEditPress}
          activeOpacity={0.85}
          style={styles.editPillWrap}
        >
          <GlassFill style={styles.editPill} intensity={28}>
            <Ionicons name="pencil" size={15} color={colors.textPrimary} />
            <Text style={[styles.editPillText, { color: colors.textPrimary }]}>
              Edit
            </Text>
          </GlassFill>
        </TouchableOpacity>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
            onPress={onFollowPress}
            disabled={followLoading}
            activeOpacity={0.85}
            style={[
              styles.followBtn,
              isFollowing ? styles.followBtnActive : null,
            ]}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing ? styles.followBtnTextActive : null,
                ]}
              >
                {isFollowing ? "Following" : "+ Follow"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Message"
            onPress={onMessagePress}
            disabled={msgLoading}
            activeOpacity={0.85}
            style={styles.chatBtn}
          >
            {msgLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    cover: {
      height: PROFILE_COVER_H,
      position: "relative",
      overflow: "hidden",
    },
    idBlock: {
      position: "absolute",
      left: 20,
      right: 110, // leave room for action FAB
      bottom: ID_BLOCK_BOTTOM,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: "#FFFFFF",
      marginBottom: 10,
    },
    avatarWrap: {
      position: "relative",
      alignSelf: "flex-start",
    },
    verifiedBadge: {
      position: "absolute",
      top: 54,
      left: 54,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFFFFF",
    },
    avatarPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.85)",
    },
    name: {
      fontSize: 22,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
      lineHeight: 26,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.85)",
      marginTop: 2,
      textShadowColor: "rgba(0,0,0,0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    bio: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.85)",
      marginTop: 4,
      lineHeight: 16,
      textShadowColor: "rgba(0,0,0,0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    countsRow: {
      marginTop: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    // Window BY — stats glass card anchor: full-width band at the cover bottom,
    // above the sub tab bar (positioning only; visual lives in
    // ProfileStatsFloatingCard / GlassFill).
    statsCard: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: STATS_CARD_BOTTOM,
    },
    counts: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.85)",
      textShadowColor: "rgba(0,0,0,0.4)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    countsNum: {
      fontWeight: "700",
      color: "#FFFFFF",
    },
    countsSep: {
      fontSize: 12,
      color: "rgba(255,255,255,0.55)",
    },
    // Window BY — Edit glass ghost pill. Wrap = absolute positioning; inner
    // editPill = GlassFill container layout (glass fill + hairline border +
    // pill radius come from GlassFill / theme tokens).
    editPillWrap: {
      position: "absolute",
      right: 18,
      bottom: ACTION_FAB_BOTTOM,
    },
    editPill: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    editPillText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
    },
    actionRow: {
      position: "absolute",
      right: 18,
      bottom: ACTION_FAB_BOTTOM,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    chatBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.4)",
    },
    followBtn: {
      height: 40,
      paddingHorizontal: 18,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    followBtnActive: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.4)",
    },
    followBtnText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
    },
    followBtnTextActive: {
      color: "#FFFFFF",
    },
  });
