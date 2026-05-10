import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  DrawerContentScrollView,
  useDrawerProgress,
} from "@react-navigation/drawer";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/useAuthStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";

const OVERLAY_OPACITY_MAX = 0.45;
const OVERLAY_OPACITY_MIN = 0.0;

const DESTRUCTIVE = "#C0392B";
const DESTRUCTIVE_DARK = "#E05C4F";

type NavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string | null;
  destructive?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { key: "plan", label: "Templates", icon: "clipboard-outline", route: "/library/plans" },
  { key: "exercise", label: "Exercises", icon: "barbell-outline", route: "/library/exercise-categories" },
  { key: "challenge", label: "Challenges", icon: "trophy-outline", route: "/community/challenges" },
  { key: "lists", label: "My Lists", icon: "list-outline", route: "/profile/lists" },
];

const BOTTOM_ITEMS: NavItem[] = [
  { key: "settings", label: "Settings", icon: "settings-outline", route: "/settings" },
  { key: "logout", label: "Log Out", icon: "log-out-outline", route: null, destructive: true },
];

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

function DrawerRow({ icon, label, destructive, onPress }: RowProps) {
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const styles = useMemo(() => createRowStyles(colors), [colors]);
  const destructiveColor = scheme === "dark" ? DESTRUCTIVE_DARK : DESTRUCTIVE;
  const labelColor = destructive ? destructiveColor : colors.textPrimary;
  const iconColor = destructive ? destructiveColor : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconWrap, destructive && { backgroundColor: "transparent" }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const logout = useAuthStore((s) => s.logout);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Dim overlay ON TOP of drawer content: darkest when drawer is closed /
  // mid-transition, fades to transparent as drawer fully opens. Matches
  // Claude's effect where the drawer feels "pressed back" until opened.
  const progress = useDrawerProgress();
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0, 1],
      [OVERLAY_OPACITY_MAX, OVERLAY_OPACITY_MIN],
      Extrapolation.CLAMP
    ),
  }));

  const handlePress = (route: string | null) => {
    props.navigation.closeDrawer();
    if (route) {
      setTimeout(() => router.push(route as never), 120);
    } else {
      logout();
    }
  };

  return (
    <View style={drawerWrapStyles.root}>
      <DrawerContentScrollView
        {...props}
        style={drawerWrapStyles.scrollFlex}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.titleRow}>
          <Text style={styles.brand}>Climmate</Text>
          <View style={styles.brandDot} />
        </View>

        {NAV_ITEMS.map((item) => (
          <DrawerRow
            key={item.key}
            icon={item.icon}
            label={item.label}
            onPress={() => handlePress(item.route)}
          />
        ))}
      </DrawerContentScrollView>

      <View style={styles.bottomSection}>
        <View style={styles.divider} />
        {BOTTOM_ITEMS.map((item) => (
          <DrawerRow
            key={item.key}
            icon={item.icon}
            label={item.label}
            destructive={item.destructive}
            onPress={() => handlePress(item.route)}
          />
        ))}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[drawerWrapStyles.overlay, overlayStyle]}
      />
    </View>
  );
}

const drawerWrapStyles = StyleSheet.create({
  root: { flex: 1 },
  scrollFlex: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
});

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    scroll: { paddingHorizontal: 16, paddingBottom: 16 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    brand: {
      fontFamily: theme.fonts.bold,
      fontSize: 26,
      color: c.textPrimary,
    },
    brandDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.accent,
      marginLeft: 8,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginVertical: 16,
    },
    bottomSection: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

const createRowStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 12,
      marginBottom: 4,
    },
    pressed: { backgroundColor: c.backgroundSecondary },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: c.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    label: {
      fontFamily: theme.fonts.medium,
      fontSize: 16,
      flex: 1,
    },
  });
