import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOOLTIP_KEY = "setup_first_log_tooltip_shown";

export default function FirstLogTooltip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TOOLTIP_KEY).then((val) => {
      if (val !== "true") setVisible(true);
    });
  }, []);

  // Auto dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => dismiss(), 8000);
    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(TOOLTIP_KEY, "true");
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Ionicons
        name="information-circle"
        size={14}
        color="#306E6F"
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Tap a grade to log a climb</Text>
        <Text style={styles.desc}>
          Tap the grade button to quickly record a send. Long press to add more
          details.
        </Text>
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={12}>
        <Ionicons name="close" size={12} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1C1C1E",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  title: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 3,
  },
  desc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 18,
  },
});
