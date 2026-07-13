import { useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import PressableScale from "@/components/ui/PressableScale";
import { useRecentGym, useFavoriteGyms } from "@/features/gyms/hooks";

const REFRESH_THROTTLE_MS = 60_000;

// DL v1 §3 — de-carded: micro-label section header + hairline list rows on
// paper (the grey card container is gone; grouping is typography + hairlines).
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
    <View style={styles.section}>
      <Text style={styles.microLabel}>{tr("我的岩馆", "My Gyms")}</Text>

      <PressableScale
        style={[styles.row, styles.rowDivided]}
        onPress={() => goToGym(primaryGym.gym_id, primaryGym.name)}
      >
        <View style={styles.rowBody}>
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
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </PressableScale>

      <PressableScale
        style={styles.row}
        onPress={() => goToGym(primaryGym.gym_id, primaryGym.name)}
      >
        <Text style={styles.activityLabel}>{tr("近期活动", "Recent Activity")}</Text>
        <Text style={styles.activityAction}>{tr("查看 feed →", "Open feed →")}</Text>
      </PressableScale>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
    },
    microLabel: {
      ...theme.textStyles.microLabel,
      color: c.textSecondary,
      marginBottom: 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
    },
    rowDivided: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowBody: {
      flex: 1,
      marginRight: 12,
    },
    gymName: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textPrimary,
      letterSpacing: -0.2,
      marginBottom: 3,
    },
    subline: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
    },
    activityLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 14.5,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    activityAction: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.accent,
    },
  });
