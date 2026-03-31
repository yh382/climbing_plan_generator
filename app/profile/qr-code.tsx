import React, { useRef, useMemo, useCallback, useState } from "react";
import { View, Text, StyleSheet, Alert, Platform, ImageBackground } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";

import { useUserStore } from "@/store/useUserStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";
import { HeaderButton } from "@/components/ui/HeaderButton";

const loginBg = require("../../assets/images/login-bg.jpg");

export default function QRCodeScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const cardRef = useRef<View>(null);
  const [saving, setSaving] = useState(false);

  const profileUrl = `https://climmate.app/u/${user?.username ?? "user"}`;
  const displayName = (user?.display_name ?? "").trim() || user?.username || "User";

  const captureCard = useCallback(async () => {
    const uri = await captureRef(cardRef, { format: "png", quality: 1.0 });
    return uri;
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access to save the QR code.");
        return;
      }
      const uri = await captureCard();
      await MediaLibrary.saveToLibraryAsync(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "QR code saved to your photo library.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }, [captureCard, saving]);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureCard();
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e: any) {
      if (e?.message !== "User did not share") {
        Alert.alert("Share failed", e?.message || "Please try again.");
      }
    }
  }, [captureCard]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          ...NATIVE_HEADER_BASE,
          title: "QR Code",
          headerTransparent: true,
          scrollEdgeEffects: { top: "soft" },
          headerLeft: () => (
            <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
          ),
        }}
      />

      {/* Card area */}
      <View style={styles.cardWrapper}>
        <View ref={cardRef} collapsable={false} style={styles.card}>
          {/* Background image baked into the capture area */}
          <ImageBackground source={loginBg} style={styles.cardBg} resizeMode="cover">
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)", "#000000"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </ImageBackground>

          {/* User info on dark overlay */}
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.username}>@{user?.username ?? "user"}</Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={profileUrl}
              size={200}
              backgroundColor="#FFFFFF"
              color="#000000"
            />
          </View>

          <Text style={styles.watermark}>climmate.app</Text>
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.actions}>
        <ActionButton
          label="Save to Photos"
          icon="square.and.arrow.down"
          onPress={handleSave}
          colors={colors}
          variant="secondary"
        />
        <ActionButton
          label="Share"
          icon="square.and.arrow.up"
          onPress={handleShare}
          colors={colors}
          variant="primary"
        />
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  colors,
  variant,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
  variant: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: isPrimary ? colors.cardDark : colors.backgroundSecondary,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          justifyContent: "center",
        }}
        onTouchEnd={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            fontFamily: theme.fonts.medium,
            color: isPrimary ? "#FFFFFF" : colors.textPrimary,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    cardWrapper: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.screenPadding,
    },
    card: {
      backgroundColor: "#000000",
      borderRadius: 20,
      paddingVertical: 36,
      paddingHorizontal: 32,
      alignItems: "center",
      width: "100%",
      maxWidth: 320,
      overflow: "hidden",
    },
    cardBg: {
      ...StyleSheet.absoluteFillObject,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      marginBottom: 12,
    },
    avatarPlaceholder: {
      backgroundColor: "#306E6F",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitial: {
      fontSize: 26,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
    },
    displayName: {
      fontSize: 18,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
      marginBottom: 2,
    },
    username: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: "rgba(255,255,255,0.6)",
      marginBottom: 24,
    },
    qrContainer: {
      padding: 12,
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      marginBottom: 16,
    },
    watermark: {
      fontSize: 12,
      fontFamily: theme.fonts.monoRegular,
      color: "rgba(255,255,255,0.4)",
      letterSpacing: 0.5,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      paddingTop: 16,
    },
  });
