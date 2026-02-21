import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProfileTopBarProps = {
  title: string;

  /** left */
  leftType?: "menu" | "back" | "none";
  onLeftPress?: () => void;

  /** right */
  showShare?: boolean;
  onSharePress?: () => void;

  showMenu?: boolean;
  onMenuPress?: () => void;

  /** layout */
  useSafeArea?: boolean;
};

export default function ProfileTopBar({
  title,

  leftType = "none",
  onLeftPress,

  showShare = false,
  onSharePress,

  showMenu = false,
  onMenuPress,

  useSafeArea = true,
}: ProfileTopBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, useSafeArea && { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* LEFT */}
        <View style={styles.side}>
          {leftType !== "none" && (
            <Pressable
              onPress={onLeftPress}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={10}
            >
              <Ionicons
                name={leftType === "back" ? "chevron-back" : "menu"}
                size={22}
                color="#111827"
              />
            </Pressable>
          )}
        </View>

        {/* CENTER */}
        <View style={styles.center}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        </View>

        {/* RIGHT */}
        <View style={[styles.side, styles.right]}>
          {showShare && (
            <Pressable
              onPress={onSharePress}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={10}
            >
              <Ionicons name="share-outline" size={21} color="#111827" />
            </Pressable>
          )}

          {showMenu && (
            <Pressable
              onPress={onMenuPress}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              hitSlop={10}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={21}
                color="#111827"
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  bar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  side: {
    width: 96,
    flexDirection: "row",
    alignItems: "center",
  },
  right: {
    justifyContent: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    backgroundColor: "rgba(17,24,39,0.06)",
  },
});
