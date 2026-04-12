// src/components/ui/BadgeUnlockToast.tsx
// Badge unlock notification toast — shown when user earns new badges.
// Features:
//   - Single badge: image + bounce animation + tier glow + name/description
//   - Multiple badges: stacked overlapping images + count
//   - 4-second auto-dismiss, tap → navigate to badge collection
//   - Pure Reanimated animations, no extra dependencies

import React, { useEffect, useRef, useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { useBadgeUnlockStore, type AwardedBadge } from "@/store/useBadgeUnlockStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";

// ── Tier colors ──

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#A0A0A0",
  gold: "#DAA520",
  diamond: "#6ECBF5",
};

function getAccentColor(badges: AwardedBadge[]): string {
  const tierOrder = ["diamond", "gold", "silver", "bronze"];
  for (const tier of tierOrder) {
    if (badges.some((b) => b.tier === tier)) return TIER_COLORS[tier];
  }
  return "#306E6F";
}

function tierLabel(tier?: string | null): string {
  if (!tier) return "";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

// ── Badge image with fallback ──

function BadgeIcon({
  badge,
  size,
  glowColor,
}: {
  badge: AwardedBadge;
  size: number;
  glowColor: string;
}) {
  const radius = size * 0.2;

  if (badge.icon_url) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            // Tier-colored glow behind the image
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <Image
          source={{ uri: badge.icon_url }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
          }}
          contentFit="cover"
        />
      </View>
    );
  }

  // Fallback: colored circle with trophy icon
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: glowColor,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      }}
    >
      <Ionicons name="trophy" size={size * 0.5} color="#FFFFFF" />
    </View>
  );
}

// ── Stacked badge images (for multi-badge) ──

const STACK_SIZE = 44;
const STACK_OVERLAP = 16;
const MAX_VISIBLE_STACK = 3;

function StackedBadges({
  badges,
  glowColor,
}: {
  badges: AwardedBadge[];
  glowColor: string;
}) {
  const visible = badges.slice(0, MAX_VISIBLE_STACK);
  const extra = badges.length - MAX_VISIBLE_STACK;
  const totalWidth =
    STACK_SIZE + (visible.length - 1) * (STACK_SIZE - STACK_OVERLAP) +
    (extra > 0 ? STACK_SIZE - STACK_OVERLAP : 0);

  return (
    <View style={{ width: totalWidth, height: STACK_SIZE, flexDirection: "row" }}>
      {visible.map((badge, i) => (
        <View
          key={badge.code}
          style={{
            position: "absolute",
            left: i * (STACK_SIZE - STACK_OVERLAP),
            zIndex: visible.length - i,
          }}
        >
          <BadgeIcon badge={badge} size={STACK_SIZE} glowColor={glowColor} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            position: "absolute",
            left: MAX_VISIBLE_STACK * (STACK_SIZE - STACK_OVERLAP),
            zIndex: 0,
            width: STACK_SIZE,
            height: STACK_SIZE,
            borderRadius: STACK_SIZE * 0.2,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main component ──

const SINGLE_IMAGE_SIZE = 56;

export default function BadgeUnlockToast() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pending = useBadgeUnlockStore((s) => s.pending);
  const dismiss = useBadgeUnlockStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animations ──
  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);
  const imageScale = useSharedValue(0.5);
  const visible = pending.length > 0;

  useEffect(() => {
    if (visible) {
      // Card slides in — high damping for a single clean overshoot then settle
      translateY.value = withSpring(0, { damping: 28, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 200 });

      // Image scale — same feel: one gentle pop then lock in place
      imageScale.value = withDelay(
        100,
        withSpring(1, { damping: 24, stiffness: 200 }),
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      timerRef.current = setTimeout(() => {
        hide();
      }, 4000);
    } else {
      translateY.value = withTiming(-140, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
      imageScale.value = 0.5;
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hide = () => {
    translateY.value = withTiming(-140, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(dismiss)();
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hide();
    router.push("/profile/badges" as any);
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  // ── Derived values ──
  const count = pending.length;
  const accent = useMemo(() => getAccentColor(pending), [pending]);
  const single = count === 1 ? pending[0] : null;

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.wrapper, { top: insets.top + 8 }, cardStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: colors.cardDark, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        {/* Tier accent bar */}
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        {single ? (
          /* ── Single badge layout ── */
          <View style={styles.singleRow}>
            <Animated.View style={imgStyle}>
              <BadgeIcon
                badge={single}
                size={SINGLE_IMAGE_SIZE}
                glowColor={accent}
              />
            </Animated.View>

            <View style={styles.textCol}>
              <Text style={styles.headerLabel}>Badge Earned</Text>
              <Text style={[styles.badgeName, { color: accent }]} numberOfLines={1}>
                ★ {single.name}
              </Text>
              {(single.tier || single.description) && (
                <Text style={styles.badgeDesc} numberOfLines={1}>
                  {[tierLabel(single.tier), single.description]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            </View>
          </View>
        ) : (
          /* ── Multi badge stacked layout ── */
          <View style={styles.multiRow}>
            <Animated.View style={imgStyle}>
              <StackedBadges badges={pending} glowColor={accent} />
            </Animated.View>

            <View style={styles.textCol}>
              <Text style={styles.headerLabel}>
                {count} New Badges Earned!
              </Text>
              <Text style={styles.badgeDesc}>Tap to view your collection</Text>
            </View>
          </View>
        )}

        {/* Bottom hint */}
        <Text style={styles.tapHint}>Tap to view all badges →</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  container: {
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingLeft: 22,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  singleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  multiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  textCol: {
    flex: 1,
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.55)",
  },
  tapHint: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
    marginTop: 8,
  },
});
