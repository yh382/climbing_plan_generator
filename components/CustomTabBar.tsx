import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Animated } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type TabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
};

export default function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const router = useRouter();
  const segments = useSegments();

  // 是否显示返回胶囊（次级页面时）
  const showBack = segments.length > 1;

  return (
    <View style={styles.container}>
      {/* 左区：返回胶囊或占位 */}
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backPill}
            onPress={() => router.back()}
            accessibilityLabel="返回"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPillPlaceholder} />
        )}
      </View>

      {/* 中区：calendar / journal / settings */}
      <View style={styles.center}>
        {["calendar", "journal", "settings"].map((routeName, index) => {
          const { options } = descriptors[state.routes[index].key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : routeName;

          const isFocused = state.index === index;

          return (
            <TouchableOpacity
              key={routeName}
              onPress={() => navigation.navigate(routeName)}
              style={styles.tab}
            >
              <Text style={{ color: isFocused ? "#007AFF" : "#666" }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 右区：生成器 */}
      <View style={styles.right}>
        <TouchableOpacity
          onPress={() => navigation.navigate("index")}
          style={styles.tab}
        >
          <Text
            style={{
              color: state.routes[state.index].name === "index" ? "#007AFF" : "#666",
            }}
          >
            生成器
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  left: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  right: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backPill: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backPillPlaceholder: {
    width: 56,
    height: 32,
  },
});
