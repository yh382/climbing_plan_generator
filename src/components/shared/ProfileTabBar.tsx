// src/components/shared/ProfileTabBar.tsx

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PROFILE_TABS = [
  { key: "posts", icon: "grid-outline", iconActive: "grid" },
  { key: "stats", icon: "stats-chart-outline", iconActive: "stats-chart" },
  { key: "badges", icon: "ribbon-outline", iconActive: "ribbon" },
] as const;

export interface ProfileTabBarProps {
  activeTab: string;
  onTabPress: (key: string) => void;
}

export default function ProfileTabBar({ activeTab, onTabPress }: ProfileTabBarProps) {
  return (
    <View style={styles.tabBarStickyWrap}>
      <View style={styles.tabBar}>
        {PROFILE_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => onTabPress(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                // @ts-ignore — icon union type
                name={isActive ? t.iconActive : t.icon}
                size={22}
                color={isActive ? "#111827" : "#9CA3AF"}
              />
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarStickyWrap: {
    backgroundColor: "#FFFFFF",
    zIndex: 20,
    elevation: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  tabBar: { flexDirection: "row", height: 52 },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center" },
  activeDot: {
    position: "absolute",
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#111827",
  },
});
