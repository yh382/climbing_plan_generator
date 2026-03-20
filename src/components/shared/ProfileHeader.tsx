// src/components/shared/ProfileHeader.tsx

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";

// Eased white fade — many stops avoid the ugly dark band of a simple 3-stop gradient
const FADE_COLORS = [
  "rgba(255,255,255,0)",
  "rgba(255,255,255,0.02)",
  "rgba(255,255,255,0.06)",
  "rgba(255,255,255,0.12)",
  "rgba(255,255,255,0.20)",
  "rgba(255,255,255,0.32)",
  "rgba(255,255,255,0.46)",
  "rgba(255,255,255,0.62)",
  "rgba(255,255,255,0.78)",
  "rgba(255,255,255,0.90)",
  "rgba(255,255,255,0.97)",
  "#FFFFFF",
] as readonly string[];
const FADE_ZONE_HEIGHT = 80;
const BRAND_GREEN = "#2BB673";
const DEFAULT_GRADIENT: [string, string, string] = ["#0F766E", "#2DD4BF", "#A7F3D0"];

export interface ProfileHeaderProps {
  name: string;
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  location: string | null;
  homeGym: string | null;
  followersCount: number;
  followingCount: number;
  gradeDisplay: string;
  totalSends: number;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  followLoading?: boolean;
  msgLoading?: boolean;
  onEditPress?: () => void;
  onFollowPress?: () => void;
  onMessagePress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onYearInReviewPress?: () => void;
  headerTitleAnimStyle: any;
  topPadding: number;
}

export default function ProfileHeader({
  name,
  username,
  avatarUrl,
  coverUrl,
  bio,
  location,
  homeGym,
  followersCount,
  followingCount,
  gradeDisplay,
  totalSends,
  isOwnProfile,
  isFollowing,
  followLoading,
  msgLoading,
  onEditPress,
  onFollowPress,
  onMessagePress,
  onFollowersPress,
  onFollowingPress,
  onYearInReviewPress,
  headerTitleAnimStyle,
  topPadding,
}: ProfileHeaderProps) {
  const bioText = bio?.trim();
  const showBio = Boolean(bioText);

  // Build address: gym full name + state/province only
  const state = location
    ? location.split(",").map((s) => s.trim()).filter(Boolean).slice(1, 2).join("")
    : "";
  const addressParts = [homeGym, state].filter(Boolean);
  const addressText = addressParts.join(", ");
  const showAddress = addressParts.length > 0;

  const currentYear = new Date().getFullYear();

  const renderBackground = () => {
    if (coverUrl) {
      return (
        <View style={StyleSheet.absoluteFill}>
          <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
          {/* Dark overlay for text readability */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
          <LinearGradient colors={FADE_COLORS as any} style={styles.blurZone} />
        </View>
      );
    }
    return (
      <>
        <LinearGradient
          colors={DEFAULT_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient colors={FADE_COLORS as any} style={styles.blurZone} />
      </>
    );
  };

  const FollowersWrapper = isOwnProfile && onFollowersPress ? TouchableOpacity : View;
  const FollowingWrapper = isOwnProfile && onFollowingPress ? TouchableOpacity : View;

  return (
    <View>
      {renderBackground()}

      <View style={{ paddingTop: topPadding }}>
        <View style={styles.headerBlock}>
          {/* Avatar row */}
          <Animated.View style={[styles.avatarRow, headerTitleAnimStyle]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarTitle} />
            ) : (
              <View style={[styles.avatarTitle, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color="#9CA3AF" />
              </View>
            )}

            <View style={styles.titleRight}>
              <Text style={styles.bigTitle} numberOfLines={1}>
                {name}
              </Text>

              {showAddress ? (
                <View style={styles.addressLine}>
                  <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {addressText}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* Bio */}
          {showBio ? (
            <Text style={styles.bioInline} numberOfLines={2}>
              {bioText}
            </Text>
          ) : null}

          {/* Row 1: Followers | Following */}
          <View style={styles.statsRow}>
            <FollowersWrapper
              {...(isOwnProfile && onFollowersPress ? { onPress: onFollowersPress, activeOpacity: 0.7 } : {})}
              style={styles.statFieldItem}
            >
              <Text style={styles.statFieldNum}>{followersCount}</Text>
              <Text style={styles.statFieldLabel}>Followers</Text>
            </FollowersWrapper>
            <View style={styles.statFieldDivider} />
            <FollowingWrapper
              {...(isOwnProfile && onFollowingPress ? { onPress: onFollowingPress, activeOpacity: 0.7 } : {})}
              style={styles.statFieldItem}
            >
              <Text style={styles.statFieldNum}>{followingCount}</Text>
              <Text style={styles.statFieldLabel}>Following</Text>
            </FollowingWrapper>
          </View>

          {/* Row 2: Grade | Sends + Action */}
          <View style={styles.statsEditRow}>
            <View style={styles.statsRow}>
              <View style={styles.statFieldItem}>
                <Text style={styles.statFieldNum}>{gradeDisplay}</Text>
                <Text style={styles.statFieldLabel}>Grade</Text>
              </View>
              <View style={styles.statFieldDivider} />
              <View style={styles.statFieldItem}>
                <Text style={styles.statFieldNum}>{totalSends}</Text>
                <Text style={styles.statFieldLabel}>Sends</Text>
              </View>
            </View>

            {isOwnProfile ? (
              <TouchableOpacity
                style={styles.primaryGreenBtn}
                onPress={onEditPress}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryGreenText}>Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.otherActionRow}>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                  onPress={onFollowPress}
                  disabled={followLoading}
                  activeOpacity={0.85}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? "#111" : "#FFF"} />
                  ) : (
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.msgBtn}
                  onPress={onMessagePress}
                  disabled={msgLoading}
                  activeOpacity={0.85}
                >
                  {msgLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Year in Review — own profile only */}
          {isOwnProfile && onYearInReviewPress && (
            <TouchableOpacity
              style={styles.yearBar}
              activeOpacity={0.85}
              onPress={onYearInReviewPress}
            >
              <Text style={styles.yearBarText}>{currentYear} Year in Review</Text>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blurZone: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FADE_ZONE_HEIGHT,
    overflow: "hidden",
  },
  headerBlock: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarTitle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.3)",
  },
  titleRight: {
    flex: 1,
    justifyContent: "center",
  },
  bigTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  addressLine: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    marginLeft: 5,
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  bioInline: {
    marginTop: 8,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },

  // Stats rows
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  statsEditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 12,
  },
  statFieldItem: { flexDirection: "row", alignItems: "baseline" },
  statFieldNum: { fontSize: 14, fontWeight: "800", marginRight: 4, color: "#FFFFFF" },
  statFieldLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  statFieldDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 12,
  },

  // Own profile: Edit button
  primaryGreenBtn: {
    height: 34,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_GREEN,
  },
  primaryGreenText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },

  // Other profile: Follow + Message buttons
  otherActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  followBtn: {
    height: 34,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND_GREEN,
  },
  followBtnActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  followBtnTextActive: {
    color: "#FFFFFF",
  },
  msgBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },

  // Year in review bar
  yearBar: {
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  yearBarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});
