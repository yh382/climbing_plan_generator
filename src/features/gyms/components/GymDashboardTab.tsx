import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

interface Props {
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

export default function GymDashboardTab({ isFavorited, onToggleFavorite }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <View style={styles.container}>
      {/* Favorite prompt — only when explicitly not favorited (standalone page) */}
      {isFavorited === false && onToggleFavorite && (
        <View style={styles.favoritePrompt}>
          <View style={styles.favoriteIconWrap}>
            <Ionicons name="star-outline" size={28} color="#F59E0B" />
          </View>
          <Text style={styles.favoriteTitle}>Join this gym's community</Text>
          <Text style={styles.favoriteSub}>
            Favorite to become a member and see your gym in Community.
          </Text>
          <TouchableOpacity
            style={styles.favoriteBtn}
            onPress={() => {
              Alert.alert(
                "Favorite this gym?",
                "This gym will appear in your Community → Gyms tab.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Favorite", onPress: onToggleFavorite },
                ],
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={16} color="#FFF" />
            <Text style={styles.favoriteBtnText}>Favorite Gym</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Partnership info section */}
      <View style={styles.partnerSection}>
        <View style={styles.iconWrap}>
          <Ionicons name="storefront-outline" size={48} color={colors.textTertiary} />
        </View>

        <Text style={styles.title}>No official gym partnership yet</Text>
        <Text style={styles.subtitle}>Stay tuned!</Text>

        <TouchableOpacity
          style={styles.infoBtn}
          activeOpacity={0.7}
          onPress={() => setShowInfo(!showInfo)}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
          <Text style={styles.infoBtnText}>Learn about partnerships</Text>
          <Ionicons
            name={showInfo ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.accent}
          />
        </TouchableOpacity>

        {showInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Want your gym on ClimMate? Recommend it to your gym! Partnered gyms
              can post route updates, events, challenges, and more.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    // Favorite prompt card
    favoritePrompt: {
      marginHorizontal: 16,
      marginTop: 20,
      padding: 24,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      alignItems: "center",
      gap: 8,
    },
    favoriteIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    favoriteTitle: {
      fontSize: 16,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      textAlign: "center",
    },
    favoriteSub: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
    },
    favoriteBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      backgroundColor: colors.cardDark,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    favoriteBtnText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFF",
    },
    // Partnership section
    partnerSection: {
      paddingHorizontal: 24,
      paddingVertical: 40,
      alignItems: "center",
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    infoBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: `${colors.accent}14`,
      borderRadius: 20,
    },
    infoBtnText: {
      fontSize: 13,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
      color: colors.accent,
    },
    infoCard: {
      marginTop: 16,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      width: "100%",
    },
    infoText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textPrimary,
      lineHeight: 21,
    },
  });
