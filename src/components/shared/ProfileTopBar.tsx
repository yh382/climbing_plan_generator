// src/components/shared/ProfileTopBar.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import Animated from "react-native-reanimated";

export interface ProfileTopBarProps {
  title: string;
  isOwnProfile: boolean;
  topbarBgStyle: any;
  topbarTitleStyle: any;
  insetTop: number;
  onBackPress?: () => void;
  onSettingsPress?: () => void;
  onMorePress?: () => void;
}

export default function ProfileTopBar({
  title,
  isOwnProfile,
  topbarBgStyle,
  topbarTitleStyle,
  insetTop,
  onBackPress,
  onSettingsPress,
  onMorePress,
}: ProfileTopBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.fixedHeader, { height: insetTop + 44 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, topbarBgStyle]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      </Animated.View>

      <View style={[styles.headerContent, { marginTop: insetTop }]}>
        <View style={{ width: 80, alignItems: "flex-start" as const }}>
          {!isOwnProfile ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onBackPress} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <Animated.View style={[styles.headerTitleContainer, topbarTitleStyle]} pointerEvents="none">
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {title}
          </Text>
        </Animated.View>

        <View style={styles.headerRightRow}>
          {isOwnProfile && onSettingsPress && (
            <TouchableOpacity style={styles.iconBtn} onPress={onSettingsPress} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          {onMorePress && (
            <TouchableOpacity style={styles.iconBtn} onPress={onMorePress} activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  headerRightRow: {
    width: 80,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
