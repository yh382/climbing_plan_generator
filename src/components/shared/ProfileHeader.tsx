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
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

const PROFILE_COVER_VISIBLE = 300;
// Content-shell overlaps cover by 24pt with rounded top corners. The cut-out
// corners need to reveal cover *image* (not the ScrollView's white bg behind
// the sibling shell), so the cover container is taller than its visible area
// — bg fills the full extended height; id-block / FABs are anchored relative
// to the visible bottom, so we offset by COVER_OVERLAP.
const COVER_OVERLAP = 35;
const PROFILE_COVER_H = PROFILE_COVER_VISIBLE + COVER_OVERLAP;
const ID_BLOCK_BOTTOM = 22 + COVER_OVERLAP;
const ACTION_FAB_BOTTOM = 22 + COVER_OVERLAP;

// Exported so the sticky tab bar spacer (in profile screens) can replicate
// the cover's bottom slice — see ProfileCoverArt below.
export const PROFILE_COVER_HEIGHT_FULL = PROFILE_COVER_H;
export const PROFILE_COVER_OVERLAP_PT = COVER_OVERLAP;

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
  /** Window BG — single-line KPI pill (cover idblock below countsRow).
   *  Reuses counts/countsNum/countsSep visual to mirror followers/following.
   *  Pre-formatted as "V7/5.13b" (boulder + rope merged with a slash). */
  gradeText?: string;
  /** Window BG — total sends count rendered alongside gradeText. */
  totalSends?: number;
  /** Window BG — tap callback for the entire KPI pill row. */
  onKPIPress?: () => void;
  /**
   * Window BX — when true (default, legacy ScrollView-child usage) the cover
   * pulls itself up by headerHeight to cancel the ScrollView's automatic
   * content inset and the parallax baseline is offset by headerHeight. When
   * false (mounted inside ProfileChromeRoot's absolute hero overlay, which
   * already sits at screen top with no content inset) neither offset applies.
   */
  bleedUnderHeader?: boolean;
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
  gradeText,
  totalSends,
  onKPIPress,
  bleedUnderHeader = true,
}: ProfileHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

      {/* Identity block: avatar + name + handle + bio + counts (bottom-left) */}
      <View style={styles.idBlock} pointerEvents="box-none">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={36} color="#9CA3AF" />
          </View>
        )}
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
        {/* Window BG — KPI single-row pill: V7/5.13b Grade · 74 Sends.
            Reuses counts visuals so it matches the followers/following row
            stacked directly above. Renders only when at least one value is
            supplied (props are optional for backward compat). */}
        {(gradeText !== undefined || totalSends !== undefined) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View ascents history"
            onPress={onKPIPress}
            disabled={!onKPIPress}
            hitSlop={6}
            style={styles.kpiRow}
          >
            <Text style={styles.counts}>
              <Text style={styles.countsNum}>{gradeText ?? "—"}</Text>
              {" Grade"}
            </Text>
            <Text style={styles.countsSep}>·</Text>
            <Text style={styles.counts}>
              <Text style={styles.countsNum}>{String(totalSends ?? 0)}</Text>
              {" Sends"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Action FAB (bottom-right) */}
      {viewMode === "self" ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={onEditPress}
          activeOpacity={0.85}
          style={styles.editPill}
        >
          <Text style={styles.editPillText}>Edit</Text>
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
    // Window BG — single-row KPI pill below countsRow. Same shape as
    // countsRow with a slightly tighter gap; pulls counts/countsNum/countsSep
    // styles unchanged so it lines up visually 1:1.
    kpiRow: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
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
    editPill: {
      position: "absolute",
      right: 18,
      bottom: ACTION_FAB_BOTTOM,
      height: 40,
      paddingHorizontal: 18,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    editPillText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
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
