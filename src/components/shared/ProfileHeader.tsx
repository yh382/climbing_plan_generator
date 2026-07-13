// src/components/shared/ProfileHeader.tsx
// Design Language v1 (W-DL4, docs/DESIGN_LANGUAGE.md) — Field Journal hero.
//
// Layout is a vertical composition INSIDE the fixed-chrome hero box
// (ProfileChromeRoot renders this via renderHero; shared by the self profile
// and app/community/u/[id].tsx):
//
//   photo region (fixed — no pull-down/parallax; S-curve fade-to-bg band)
//   → identity block on paper (ink text — no more white-on-photo)
//   → typographic stat row (mono values; replaces the Window-BY glass
//     floating stats card)
//
// Seam invariant (Window BY): the hero's bottom band is solid
// colors.background BY CONSTRUCTION (identity + strip sit on paper), so the
// opaque sub-tab bar below connects seamlessly without gradient tuning.
// ⚠️ Do NOT reintroduce scroll-driven pinning / measure() here — fixed
// geometry only (Window BX 拖影 root cause).

import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { LinearGradient } from "expo-linear-gradient";
import { useSettings } from "@/contexts/SettingsContext";
import type { Affiliation } from "@/features/orgs/types";
import PressableScale from "@/components/ui/PressableScale";

// ── Fixed hero geometry (DL v1) ────────────────────────────────────────────
// Photo region includes the status-bar / nav-bar bleed (transparent header).
// 290 ≈ 34% of an 852pt screen (device feedback 2026-07-01: 250 read short).
const PHOTO_REGION_H = 300;
// Photo→paper dissolve = a single eased alpha ramp (决策 2026-07-01: blur
// variants — stacked BlurViews AND true CAFilter variableBlur — both read
// wrong on device; the plain "white mist" won, softened via an S-curve
// instead of a linear ramp). Full bg lands exactly AT the photo bottom edge
// (paper starts there by construction). Band height is a device-tuned knob —
// current 110/300 ≈ 37%, deliberately beyond the DL §1 15–22% guideline
// (user preference; see BACKLOG DL-FADE-SPEC).
const FADE_BAND_H = 110;
const AVATAR_SIZE = 76;
// Avatar position — device-tuned 2026-07-01 across four rounds (1/3 → 45% →
// 70% → fully inside): OVERLAP 80 > AVATAR_SIZE 76, so the avatar now sits
// entirely within the photo region, its bottom edge 4pt above the
// photo→paper boundary.
const AVATAR_OVERLAP = 80;
const SCREEN_PAD = 20;
// Horizontal identity lockup (决策 2026-07-01): name + @handle sit BESIDE the
// avatar (reclaims ~32pt of header height); gym / bio / counts run full-width
// below the avatar row.
const NAME_COL_TOP = PHOTO_REGION_H - 73; // 227 — name col overlays the photo's fade band
// 对调 2026-07-01 — stats row sits directly under the name column; the
// gym/bio info block follows below it. (+82: extra air below the avatar row.)
const STRIP_TOP = NAME_COL_TOP + 82;
const STRIP_H = 40;
const INFO_TOP = STRIP_TOP + STRIP_H + 12;
// gym + bio only (counts live in the name column).
const INFO_H = 44;
// 12pt of air between the info block and the segmented bar.
const PROFILE_HERO_H = INFO_TOP + INFO_H + 12;

// Legacy-shaped exports — both profile screens compute
// `HERO_HEIGHT = FULL - OVERLAP`. The paper composition has no hidden
// overlap slice anymore, so OVERLAP is 0 and FULL is the hero height itself.
export const PROFILE_COVER_HEIGHT_FULL = PROFILE_HERO_H;
export const PROFILE_COVER_OVERLAP_PT = 0;

// Convert theme bg hex to "r,g,b" for the fade band's alpha stops (渐白 in
// light / 渐黑 in dark — never a hardcoded white).
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
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
 * Standalone cover background renderer — Image + soft darkening overlay when
 * `coverUrl` is provided, default diagonal gradient otherwise. Fills its
 * parent via `StyleSheet.absoluteFill`.
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
  /** Typographic stat strip (B Best / R Best / Sends / Sessions). */
  boulderGrade?: string;
  routeGrade?: string;
  totalSends?: number;
  /** Session count (kpis.sessionCount). Other-user omits → "—". */
  totalSessions?: number;
  /** Tap callback for the stat strip (→ ascents history). */
  onKPIPress?: () => void;
  /** P2-A — verified gym affiliations (setter badge). */
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
  boulderGrade,
  routeGrade,
  totalSends,
  totalSessions,
  onKPIPress,
  affiliations,
}: ProfileHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const staffLabel = useMemo(() => {
    const staff = (affiliations ?? []).filter(
      (a) => a.is_setter || a.is_head_setter || a.role === "owner",
    );
    if (!staff.length) return null;
    if (staff.some((a) => a.is_head_setter)) return tr("主力定线员", "Head setter");
    if (staff.some((a) => a.is_setter)) return tr("定线员", "Setter");
    return tr("馆主", "Owner");
  }, [affiliations, tr]);

  // No pull-down behavior on the hero (决策 2026-07-01): the elastic/stretch
  // variants both read wrong on device (photo-only parallax = detached
  // middle; whole-header elastic = per-frame layout jitter). The header is
  // simply FIXED — overscroll only bounces the content region below it.

  const bgRgb = useMemo(() => hexToRgb(colors.background), [colors.background]);
  // Eased S-curve stops (slow head, fast tail) — a linear ramp read as a
  // "hard" mist edge on device; full bg lands exactly at the band's end.
  const fadeColors = useMemo(
    () =>
      [
        `rgba(${bgRgb},0)`,
        `rgba(${bgRgb},0.35)`,
        `rgba(${bgRgb},0.85)`,
        colors.background,
      ] as const,
    [bgRgb, colors.background],
  );
  const fadeLocations = [0, 0.30, 0.70, 1] as const;

  const bioText = bio?.trim() || "";
  const homeGymText = homeGym?.trim() || "";
  const showBio = bioText.length > 0;

  const stripCells = useMemo(
    () => [
      { key: "b", label: tr("抱石最高", "B Best"), value: boulderGrade ?? "—" },
      { key: "r", label: tr("难度最高", "R Best"), value: routeGrade ?? "—" },
      {
        key: "s",
        label: tr("send 数", "Sends"),
        value: totalSends != null ? String(totalSends) : "—",
      },
      {
        key: "n",
        label: tr("场次", "Sessions"),
        value: totalSessions != null ? String(totalSessions) : "—",
      },
    ],
    [boulderGrade, routeGrade, totalSends, totalSessions, tr],
  );

  return (
    <View
      // box-none: vertical drags fall through to the per-tab scroll view;
      // the interactive children below still receive taps.
      pointerEvents="box-none"
      style={styles.hero}
    >
      {/* Photo region — fixed; top scrim (toolbar legibility) + frosted
          dissolve. */}
      <View pointerEvents="none" style={styles.photoBox}>
        <View style={StyleSheet.absoluteFill}>
          <ProfileCoverArt coverUrl={coverUrl} />
        </View>
        <LinearGradient
          colors={["rgba(0,0,0,0.28)", "rgba(0,0,0,0)"]}
          style={styles.topScrim}
        />
        <LinearGradient
          colors={fadeColors}
          locations={fadeLocations}
          style={styles.fadeBand}
        />
      </View>

      {/* Paper group — identity + strip on paper below the photo. */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Paper backing under identity + strip — the hero overlays the
          PagerView, so this band must be opaque bg. */}
      <View pointerEvents="none" style={styles.paperBacking} />

      {/* Avatar — straddles the photo→paper boundary by ~1/3 diameter.
          Self profile: the avatar IS the edit entry, no extra affordance
          (决策 2026-07-01: users expect a tappable avatar; a pencil badge
          reads as clutter). */}
      {viewMode === "self" ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={tr("编辑资料", "Edit profile")}
          onPress={onEditPress}
          style={styles.avatarWrap}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={34} color={colors.textTertiary} />
            </View>
          )}
        </PressableScale>
      ) : (
        <View style={styles.avatarWrap} pointerEvents="none">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={34} color={colors.textTertiary} />
            </View>
          )}
        </View>
      )}

      {/* Other-user actions — Follow pill (the screen's single capsule) +
          message ghost, aligned with the name row. */}
      {viewMode === "self" ? null : (
        <View style={[styles.actionAnchor, styles.actionRow]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
            onPress={onFollowPress}
            disabled={followLoading}
            activeOpacity={0.85}
            style={[styles.followBtn, isFollowing ? styles.followBtnActive : null]}
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={isFollowing ? colors.textPrimary : colors.textOnAccent}
              />
            ) : (
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing ? styles.followBtnTextActive : null,
                ]}
              >
                {isFollowing ? tr("已关注", "Following") : tr("+ 关注", "+ Follow")}
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
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons
                name="chatbubble-outline"
                size={17}
                color={colors.textPrimary}
              />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Name column — beside the avatar: name + Setter tag / @handle /
          followers · following (决策 2026-07-01: counts live under the
          handle, not in the full-width info block). */}
      <View
        style={[styles.nameCol, viewMode === "other" ? styles.nameColOther : null]}
        pointerEvents="box-none"
      >
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {staffLabel ? (
            <View style={styles.setterTag}>
              <Ionicons name="checkmark-circle" size={12} color={colors.accent} />
              <Text style={styles.setterTagText}>{staffLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.handle} numberOfLines={1}>
          @{username}
        </Text>
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
              {` ${tr("粉丝", "followers")}`}
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
              {` ${tr("关注", "following")}`}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Info block — full width below the avatar row: gym / bio. */}
      <View style={styles.infoBlock} pointerEvents="box-none">
        {homeGymText ? (
          <Text style={styles.gymLine} numberOfLines={1}>
            {tr("主场岩馆", "Home gym")}
            {" · "}
            <Text style={styles.gymName}>{homeGymText}</Text>
          </Text>
        ) : null}
        {showBio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {bioText}
          </Text>
        ) : null}
      </View>

      {/* Stat row — quiet, left-aligned typography flowing with the identity
          block above (决策 2026-07-01: the bordered/centered strip read as a
          table slab dropped into the page). Still tappable → ascents. */}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="View ascents history"
        onPress={onKPIPress}
        disabled={!onKPIPress}
        style={styles.strip}
      >
        {stripCells.map((c) => (
          <View key={c.key} style={styles.cell}>
            <Text style={styles.cellValue} numberOfLines={1}>
              {c.value}
            </Text>
            <Text style={styles.cellLabel} numberOfLines={1}>
              {c.label}
            </Text>
          </View>
        ))}
      </PressableScale>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    hero: {
      height: PROFILE_HERO_H,
      position: "relative",
    },
    paperBacking: {
      position: "absolute",
      top: PHOTO_REGION_H,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
    },
    photoBox: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: PHOTO_REGION_H,
      overflow: "hidden",
    },
    topScrim: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 110,
    },
    fadeBand: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: FADE_BAND_H,
    },
    avatarWrap: {
      position: "absolute",
      left: SCREEN_PAD,
      top: PHOTO_REGION_H - AVATAR_OVERLAP,
      zIndex: 2,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: colors.cardBackground,
      borderWidth: 3,
      borderColor: colors.background,
    },
    avatarPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    // Aligned with the name row baseline — name / Setter tag / action form one
    // visual line (device feedback 2026-07-01: anchored at the photo bottom it
    // floated in empty space with nothing to attach to).
    actionAnchor: {
      position: "absolute",
      right: SCREEN_PAD,
      top: NAME_COL_TOP,
      zIndex: 2,
    },
    // Follow/message buttons are 38pt vs the 27pt name line — pull up to
    // center against it.
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: -6,
    },
    followBtn: {
      height: 38,
      paddingHorizontal: 18,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    followBtnActive: {
      backgroundColor: colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    followBtnText: {
      fontSize: 14,
      fontFamily: theme.fonts.bold,
      color: colors.textOnAccent,
    },
    followBtnTextActive: {
      color: colors.textPrimary,
    },
    chatBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    // Name column beside the avatar. Self profile has no same-line action
    // (avatar = edit entry) so it runs to the screen edge; other-user
    // reserves 148 for the Follow pill + chat ghost on the name line.
    nameCol: {
      position: "absolute",
      left: SCREEN_PAD + AVATAR_SIZE + 12,
      right: SCREEN_PAD,
      top: NAME_COL_TOP,
    },
    nameColOther: {
      right: 148,
    },
    // Full-width info block below the avatar row.
    infoBlock: {
      position: "absolute",
      left: SCREEN_PAD,
      right: SCREEN_PAD,
      top: INFO_TOP,
      height: INFO_H,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    name: {
      flexShrink: 1,
      fontSize: 23,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      letterSpacing: -0.5,
      lineHeight: 27,
    },
    // DL §2.6 — identity badge: mono outline tag, not a solid capsule.
    setterTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2.5,
    },
    setterTagText: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: colors.accent,
    },
    handle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      marginTop: 3,
    },
    gymLine: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    gymName: {
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    bio: {
      fontSize: 13.5,
      fontFamily: theme.fonts.regular,
      color: colors.textPrimary,
      marginBottom: 5,
      lineHeight: 18,
    },
    countsRow: {
      marginTop: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    counts: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    countsNum: {
      fontFamily: theme.fonts.monoMedium,
      color: colors.textPrimary,
    },
    countsSep: {
      fontSize: 13,
      color: colors.textTertiary,
    },
    // Aligned with the identity block (SCREEN_PAD, left-aligned columns) —
    // no borders/dividers, it reads as one more line of the profile, not a
    // separate module.
    strip: {
      position: "absolute",
      // Tighter side margins than SCREEN_PAD — the centered 平铺 columns
      // already carry visual padding of their own.
      left: 10,
      right: 10,
      top: STRIP_TOP,
      height: STRIP_H,
      flexDirection: "row",
      alignItems: "center",
    },
    // 平铺 — four equal columns filling the row, content centered per column.
    cell: {
      flex: 1,
      alignItems: "center",
    },
    cellValue: {
      ...theme.textStyles.monoValue,
      color: colors.textPrimary,
    },
    cellLabel: {
      ...theme.textStyles.microLabel,
      color: colors.textTertiary,
      marginTop: 3,
    },
  });
