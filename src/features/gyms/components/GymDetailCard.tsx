import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet, Alert, Linking, ActionSheetIOS, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { GymPlace } from "../../../../lib/poi/types";
import { gymCommunityApi } from "../api";

interface GymDetailCardProps {
  gym: GymPlace;
  onClose: () => void;
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

export function GymDetailCard({ gym, onClose, colors, primary, primaryBg }: GymDetailCardProps) {
  const [navigating, setNavigating] = useState(false);

  const handleViewProfile = useCallback(async () => {
    setNavigating(true);
    try {
      const result = await gymCommunityApi.ensureGym(gym.place_id);
      router.push(`/gyms/${result.gym_id}`);
    } catch {
      Alert.alert("Error", "Could not load gym page");
    } finally {
      setNavigating(false);
    }
  }, [gym.place_id]);

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

  return (
    <View
      style={[
        styles.detailCard,
        styles.detailCardHighlight,
        { backgroundColor: colors.shellBg, borderColor: colors.shellBorder, marginHorizontal: 16 },
      ]}
    >
      <View style={[styles.detailStripe, { backgroundColor: primary }]} />
      <Text style={[styles.detailTitle, { color: colors.iconLabel }]} numberOfLines={2}>
        {gym.name}
      </Text>
      <Text style={[styles.detailMeta, { color: colors.iconInactive }]}>
        {gym.distanceMiles.toFixed(1)} mi
        {gym.rating ? ` · ${gym.rating} (${gym.user_ratings_total ?? 0})` : ""}
      </Text>
      {(gym.vicinity || gym.formatted_address) && (
        <Text style={[styles.detailAddr, { color: colors.iconInactive }]} numberOfLines={2}>
          {gym.vicinity || gym.formatted_address}
        </Text>
      )}

      <View style={styles.detailActions}>
        <TouchableOpacity
          onPress={handleNavigate}
          activeOpacity={0.9}
          style={[styles.actionBase, styles.actionPrimary, { backgroundColor: primaryBg, borderColor: primaryBg }]}
        >
          <Ionicons name="navigate" size={18} color={primary} style={{ marginRight: 8 }} />
          <Text style={[styles.actionPrimaryText, { color: primary }]}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleViewProfile}
          activeOpacity={0.9}
          disabled={navigating}
          style={[styles.actionBase, styles.actionGhost, { borderColor: primary }]}
        >
          {navigating ? (
            <ActivityIndicator size="small" color={primary} />
          ) : (
            <>
              <Ionicons name="people-outline" size={16} color={primary} style={{ marginRight: 6 }} />
              <Text style={[styles.actionGhostText, { color: primary }]}>Community</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.9}
          style={[styles.actionBase, styles.actionGhost, { borderColor: colors.shellBorder }]}
        >
          <Text style={[styles.actionGhostText, { color: colors.iconInactive }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  detailCardHighlight: {
    borderColor: "#93c5fd",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === "android" ? 6 : 0,
  },
  detailStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.9,
  },
  detailTitle: { fontSize: 17, fontWeight: "800" },
  detailMeta: { fontSize: 13, marginTop: 2 },
  detailAddr: { fontSize: 13, marginTop: 2 },
  detailActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  actionBase: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  actionPrimary: { borderWidth: StyleSheet.hairlineWidth },
  actionPrimaryText: { fontSize: 14, fontWeight: "800" },
  actionGhost: { backgroundColor: "transparent", borderWidth: StyleSheet.hairlineWidth },
  actionGhostText: { fontSize: 14, fontWeight: "700" },
});
