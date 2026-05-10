import { useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { useRecentGym, useFavoriteGyms } from "@/features/gyms/hooks";

const REFRESH_THROTTLE_MS = 60_000;

export function MyGymsCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const { recentGym, refresh: refreshRecent } = useRecentGym();
  const { favorites, refresh: refreshFav } = useFavoriteGyms();
  const lastFetchRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFetchRef.current > REFRESH_THROTTLE_MS) {
        lastFetchRef.current = now;
        refreshRecent();
        refreshFav();
      }
    }, [refreshRecent, refreshFav]),
  );

  const primaryGym = recentGym ?? (favorites.length > 0 ? favorites[0] : null);
  if (!primaryGym) return null;

  const goToGym = (gymId: string, gymName: string) =>
    router.push({
      pathname: "/gym-community",
      params: { gymId, gymName },
    });

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.updatesSection}
        onPress={() => goToGym(primaryGym.gym_id, primaryGym.name)}
      >
        <View style={styles.headerRow}>
          <Text style={styles.label}>{tr("我的岩馆", "My Gyms")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
        <Text style={styles.gymName} numberOfLines={1}>{primaryGym.name}</Text>
        {"weekly_active" in primaryGym && primaryGym.weekly_active > 0 ? (
          <Text style={styles.subline}>
            {`${primaryGym.weekly_active} ${tr("人本周活跃", "active this week")}`}
          </Text>
        ) : (
          <Text style={styles.subline}>
            {tr("最近一次签到", "Most recent check-in")}
          </Text>
        )}
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={styles.activitySection}
        onPress={() => goToGym(primaryGym.gym_id, primaryGym.name)}
      >
        <Text style={styles.activityLabel}>{tr("近期活动", "Recent Activity")}</Text>
        <Text style={styles.activitySubtle}>{tr("查看 feed →", "Open feed →")}</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
      borderRadius: theme.borderRadius.card,
      overflow: "hidden",
      backgroundColor: c.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    updatesSection: {
      backgroundColor: c.backgroundSecondary,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    label: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    gymName: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      marginBottom: 4,
    },
    subline: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    activitySection: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    activityLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: c.textPrimary,
    },
    activitySubtle: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
    },
  });
