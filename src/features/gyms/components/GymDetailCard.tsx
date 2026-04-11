import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  Alert,
  Linking,
  ActionSheetIOS,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { GymPlace } from "../../../../lib/poi/types";
import { gymCommunityApi } from "../api";
import { useGymFavoriteToggle } from "../hooks";
import GymStatsCard from "./GymStatsCard";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "../../../contexts/SettingsContext";

interface GymDetailCardProps {
  gym: GymPlace;
  onClose: () => void;
  // Kept for API compatibility with the existing GymList props plumbing.
  colors: {
    shellBg: string;
    shellBorder: string;
    iconLabel: string;
    iconInactive: string;
    iconActive: string;
  };
  primary: string;
  primaryBg: string;
}

export function GymDetailCard({ gym, onClose, primaryBg }: GymDetailCardProps) {
  const themeColors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  // Light-green accent tint for the action pills — echoes the brand
  // color (`#306E6F`) and matches the accent backgrounds used on the
  // gym-community side page. `primaryBg` comes from useGymsColors:
  //   light → rgba(48,110,111,0.15)
  //   dark  → rgba(48,110,111,0.22)
  const actionBtnBg = primaryBg;

  const [gymId, setGymId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const {
    isFavorited,
    toggle: toggleFavorite,
    loaded: favLoaded,
  } = useGymFavoriteToggle();

  // Resolve the internal gym_id from the Google place_id as soon as the card
  // mounts (or the gym changes). This unlocks the Favorite button and the
  // embedded GymStatsCard, both of which key off our internal UUID. The
  // cancelled flag prevents stale writes if the user quickly taps another pin.
  useEffect(() => {
    let cancelled = false;
    setGymId(null);
    gymCommunityApi
      .ensureGym(gym.place_id)
      .then((r) => {
        if (!cancelled) setGymId(r.gym_id);
      })
      .catch(() => {
        // Swallow — the Directions button still works without gym_id, and
        // the stats area just keeps its loading spinner.
      });
    return () => {
      cancelled = true;
    };
  }, [gym.place_id]);

  const handleViewCommunity = useCallback(async () => {
    setNavigating(true);
    try {
      const id =
        gymId ?? (await gymCommunityApi.ensureGym(gym.place_id)).gym_id;
      // Dismiss L2 first so the sheet slides out while the new screen
      // pushes in — Apple Maps-style cross-fade between contexts.
      onClose();
      router.push({
        pathname: "/gym-community",
        params: { gymId: id, gymName: gym.name },
      });
    } catch {
      Alert.alert("Error", "Could not load gym page");
    } finally {
      setNavigating(false);
    }
  }, [gym.place_id, gym.name, gymId, onClose]);

  const handleFavorite = useCallback(() => {
    if (!gymId) return;
    toggleFavorite(gymId);
  }, [gymId, toggleFavorite]);

  const handleNavigate = useCallback(async () => {
    const { lat, lng } = gym.location;
    const label = encodeURIComponent(gym.name);

    if (Platform.OS === "android") {
      const gNav = `google.navigation:q=${lat},${lng}`;
      const gDir = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const url = (await Linking.canOpenURL(gNav)) ? gNav : gDir;
      Alert.alert("Open Navigation?", "即将打开 Google Maps 进行导航", [
        { text: "取消", style: "cancel" },
        { text: "打开", onPress: () => Linking.openURL(url) },
      ]);
      return;
    }

    const apple = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${label}`;
    const gApp = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    let canGoogle = false;
    try {
      canGoogle = await Linking.canOpenURL(gApp);
    } catch {
      // Google Maps not declared in LSApplicationQueriesSchemes or not installed
    }

    const options = canGoogle ? ["Apple Maps", "Google Maps", "取消"] : ["Apple Maps", "取消"];
    const cancelIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex },
      (idx) => {
        if (idx === cancelIndex) return;
        if (options[idx] === "Google Maps") Linking.openURL(gApp);
        else Linking.openURL(apple);
      },
    );
  }, [gym]);

  const distanceText =
    gym.distance_m == null
      ? null
      : gym.distance_m < 1000
        ? `${Math.round(gym.distance_m)} m`
        : `${(gym.distance_m / 1000).toFixed(1)} km`;

  const favActive = gymId ? isFavorited(gymId) : false;

  return (
    <View style={styles.detail}>
      {/* Header: name + "Climbing Gym · distance" subtitle. Right padding
          leaves room for the pinned close X that GymsScreen renders as a
          sibling of the ScrollView. */}
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>
          {gym.name}
        </Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>
            {tr("攀岩馆", "Climbing Gym")}
          </Text>
          {distanceText && (
            <>
              <Text style={styles.subtitleDot}>·</Text>
              <Text style={styles.distance}>{distanceText}</Text>
            </>
          )}
        </View>
      </View>

      {/* Three Apple Maps-style action buttons: Directions / Community /
          Favorite. Filled rounded squares with stacked icon + label. */}
      <View style={styles.actionRow}>
        <ActionButton
          icon="navigate"
          label={tr("导航", "Directions")}
          onPress={handleNavigate}
          colors={themeColors}
          bg={actionBtnBg}
        />
        <ActionButton
          icon="people-outline"
          label={tr("社区", "Community")}
          onPress={handleViewCommunity}
          loading={navigating}
          colors={themeColors}
          bg={actionBtnBg}
        />
        <ActionButton
          icon={favActive ? "heart" : "heart-outline"}
          label={tr("收藏", "Favorite")}
          onPress={handleFavorite}
          disabled={!gymId || !favLoaded}
          colors={themeColors}
          bg={actionBtnBg}
        />
      </View>

      {!!gym.address && (
        <View style={styles.addressRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={themeColors.textSecondary}
          />
          <Text style={styles.addressText} numberOfLines={2}>
            {gym.address}
          </Text>
        </View>
      )}

      {/* Community KPI block. Waits for ensureGym to resolve gym_id before
          mounting GymStatsCard so we don't double-spinner. */}
      {gymId ? (
        <View style={styles.statsWrap}>
          <GymStatsCard gymId={gymId} />
        </View>
      ) : (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="small" color={themeColors.textSecondary} />
        </View>
      )}
    </View>
  );
}

// ---- Private ActionButton ----------------------------------------------

interface ActionButtonProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  colors: ReturnType<typeof useThemeColors>;
  bg: string;
}

function ActionButton({
  icon,
  label,
  onPress,
  loading,
  disabled,
  colors,
  bg,
}: ActionButtonProps) {
  const isInert = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInert}
      activeOpacity={0.75}
      style={[
        actionBtnStyles.btn,
        { backgroundColor: bg },
        isInert && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={colors.accent} />
          <Text
            style={[actionBtnStyles.label, { color: colors.accent }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const actionBtnStyles = StyleSheet.create({
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});

// ---- Styles -------------------------------------------------------------

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    // No shell: no background, no border, no shadow, no corner radius.
    // GymsScreen wraps this card in a ScrollView inside the L2 detail
    // TrueSheet; the sheet provides the liquid-glass background.
    detail: {
      paddingHorizontal: 22,
      // Extra top padding so the gym name sits clearly below the sheet
      // grabber (Apple Maps breathing room).
      paddingTop: 22,
      paddingBottom: 14,
    },
    header: {
      // Leave room on the right for the pinned close X that GymsScreen
      // renders as an absolute sibling of the ScrollView.
      paddingRight: 48,
      marginBottom: 16,
    },
    name: {
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 26,
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    subtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      gap: 4,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: "500",
      color: c.textSecondary,
    },
    subtitleDot: {
      fontSize: 13,
      color: c.textSecondary,
    },
    distance: {
      fontSize: 13,
      fontWeight: "500",
      color: c.accent,
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
    },
    addressRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginBottom: 14,
      paddingHorizontal: 4,
    },
    addressText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
    },
    // GymStatsCard has its own paddingHorizontal 16. Offset the outer 22
    // so GymStatsCard's internal padding owns the horizontal layout.
    statsWrap: {
      marginHorizontal: -22,
      marginTop: 4,
    },
    statsLoading: {
      marginTop: 20,
      alignItems: "center",
    },
  });
