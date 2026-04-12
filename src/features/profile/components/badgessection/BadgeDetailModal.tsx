// src/features/profile/components/badgessection/BadgeDetailModal.tsx
// Centered modal overlay for viewing badge details.
// Tap badge → background dims → card floats centered with full info + Pin button.

import { useCallback, useEffect, useMemo } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Alert, Platform, ActionSheetIOS } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import type { ThemeColors } from "@/lib/theme";
import { useUserStore } from "@/store/useUserStore";
import type { Badge, BadgeTier } from "./types";

// ── Tier colors ──

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#A0A0A0",
  gold: "#DAA520",
  diamond: "#6ECBF5",
};

function tierColor(tier?: BadgeTier): string {
  if (!tier) return "#306E6F";
  return TIER_COLORS[tier] ?? "#306E6F";
}

function tierLabel(tier?: BadgeTier): string {
  if (!tier) return "";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// ── Component ──

type Props = {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
  tr: (zh: string, en: string) => string;
};

export default function BadgeDetailModal({ badge, visible, onClose, tr }: Props) {
  const colors = useThemeColors();
  const s = useMemo(() => createStyles(colors), [colors]);

  // ── Pin state ──
  const pinnedCodes = useUserStore((st) => st.user?.pinned_badges) ?? [];
  const updateMe = useUserStore((st) => st.updateMe);
  const isPinned = badge ? pinnedCodes.includes(badge.id) : false;
  const canPin = badge?.status === "unlocked";

  const handlePin = useCallback(() => {
    if (!badge) return;
    let next: string[];
    if (isPinned) {
      next = pinnedCodes.filter((c) => c !== badge.id);
    } else {
      if (pinnedCodes.length >= 3) {
        Alert.alert(
          tr("已达上限", "Limit Reached"),
          tr("最多置顶 3 个徽章", "You can pin up to 3 badges"),
        );
        return;
      }
      next = [...pinnedCodes, badge.id];
    }
    updateMe({ pinned_badges: next } as any);
    onClose();
  }, [badge, isPinned, pinnedCodes, updateMe, tr, onClose]);

  // ── Animation ──
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 28, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0.9, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!badge) return null;

  const locked = badge.status === "locked";
  const tColor = tierColor(badge.tier as BadgeTier);
  const progress = Math.round((badge.progress ?? 0) * 100);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={s.backdrop} onPress={onClose}>
        <Animated.View style={[s.backdropFill, backdropAnim]} />
      </Pressable>

      {/* Centered card */}
      <View style={s.centerWrap} pointerEvents="box-none">
        <Animated.View style={[s.card, cardAnim]}>
          {/* Badge image */}
          <View style={[s.imgWrap, { shadowColor: locked ? "transparent" : tColor }]}>
            {badge.iconUrl ? (
              <Image
                source={{ uri: badge.iconUrl }}
                style={[s.img, locked && { opacity: 0.3 }]}
                contentFit="contain"
              />
            ) : (
              <View style={[s.img, { backgroundColor: colors.backgroundSecondary, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="trophy" size={36} color={locked ? colors.textTertiary : tColor} />
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={[s.name, { color: locked ? "rgba(255,255,255,0.7)" : tColor }]}>
            {locked ? badge.title : `★ ${badge.title}`}
          </Text>

          {/* Tier */}
          {badge.tier && (
            <Text style={[s.tier, { color: tColor }]}>
              {tierLabel(badge.tier as BadgeTier)}
            </Text>
          )}

          {/* Description */}
          {badge.description && (
            <Text style={s.description}>{badge.description}</Text>
          )}

          {/* Progress (locked only) */}
          {locked && typeof badge.threshold === "number" && badge.threshold > 0 && (
            <View style={s.progressRow}>
              <View style={[s.progressTrack, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <View
                  style={[s.progressFill, { width: `${progress}%`, backgroundColor: tColor }]}
                />
              </View>
              <Text style={[s.progressText, { color: tColor }]}>
                {badge.currentValue ?? 0}/{badge.threshold}
              </Text>
            </View>
          )}

          {/* Rarity */}
          {typeof badge.rarity === "number" && badge.rarity > 0 && (
            <Text style={s.rarity}>
              {badge.rarity < 1 ? "<1" : Math.round(badge.rarity)}% {tr("的岩友拥有", "of climbers earned")}
            </Text>
          )}

          {/* Awarded date (unlocked only) */}
          {!locked && badge.awardedAt && (
            <Text style={s.date}>
              {tr("获得于 ", "Earned ")}
              {new Date(badge.awardedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          )}

          {/* Pin button (unlocked only) */}
          {canPin && (
            <Pressable
              onPress={handlePin}
              style={({ pressed }) => [
                s.pinButton,
                { backgroundColor: isPinned ? "rgba(255,255,255,0.2)" : tColor, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[s.pinText, { color: "#FFFFFF" }]}>
                {isPinned ? tr("取消置顶", "Unpin") : tr("置顶到主页", "Pin to Profile")}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ──

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    backdropFill: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.75)",
    },
    centerWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },

    card: {
      width: "100%",
      padding: 20,
      alignItems: "center",
    },

    imgWrap: {
      width: 120,
      height: 120,
      marginBottom: 20,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
    },
    img: {
      width: 120,
      height: 120,
      borderRadius: 20,
    },

    name: {
      fontSize: 22,
      fontWeight: "800",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: 4,
    },
    tier: {
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      marginBottom: 10,
    },
    description: {
      fontSize: 15,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.85)",
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 12,
    },

    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "100%",
      marginBottom: 10,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
    },
    progressText: {
      fontSize: 15,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
    },

    rarity: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.6)",
      marginBottom: 8,
    },
    date: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.7)",
      marginBottom: 16,
    },

    pinButton: {
      width: "100%",
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 8,
    },
    pinText: {
      fontSize: 16,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
    },
  });
}
