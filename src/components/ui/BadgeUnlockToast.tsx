import React, { useEffect, useRef } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { useBadgeUnlockStore, type AwardedBadge } from "@/store/useBadgeUnlockStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#A0A0A0",
  gold: "#DAA520",
  diamond: "#6ECBF5",
};

function getAccentColor(badges: AwardedBadge[]): string {
  // Use the highest-tier badge's color, or default accent
  const tierOrder = ["diamond", "gold", "silver", "bronze"];
  for (const tier of tierOrder) {
    if (badges.some((b) => b.tier === tier)) return TIER_COLORS[tier];
  }
  return "#306E6F";
}

export default function BadgeUnlockToast() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pending = useBadgeUnlockStore((s) => s.pending);
  const dismiss = useBadgeUnlockStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const visible = pending.length > 0;

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      timerRef.current = setTimeout(() => {
        hide();
      }, 4000);
    } else {
      translateY.value = withTiming(-120, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hide = () => {
    translateY.value = withTiming(-120, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(dismiss)();
    });
  };

  const handlePress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hide();
    router.push("/profile/badges" as any);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const count = pending.length;
  const accent = getAccentColor(pending);
  const single = count === 1 ? pending[0] : null;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + 8 },
        animStyle,
      ]}
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
        <Animated.View style={[styles.accentBar, { backgroundColor: accent }]} />

        <Text style={styles.title}>
          {single
            ? `Badge Earned: ${single.name}`
            : `${count} New Badges Earned!`}
        </Text>
        <Text style={styles.subtitle}>
          {single?.description || "Tap to view"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  container: {
    borderRadius: 14,
    paddingVertical: 14,
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
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: "rgba(255,255,255,0.6)",
  },
});
