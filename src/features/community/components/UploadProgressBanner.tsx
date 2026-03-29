// Small banner shown at the top of the community feed while a post is uploading.

import React from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "src/lib/useThemeColors";
import { theme } from "src/lib/theme";
import {
  usePostUploadState,
  retryUpload,
  dismissUploadBanner,
} from "../postUploadManager";

export default function UploadProgressBanner() {
  const { status, error } = usePostUploadState();
  const colors = useThemeColors();

  if (status === "idle") return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.cardDark },
      ]}
    >
      {status === "uploading" && (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.text}>Posting...</Text>
        </>
      )}

      {status === "success" && (
        <>
          <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
          <Text style={styles.text}>Posted!</Text>
        </>
      )}

      {status === "error" && (
        <>
          <Ionicons name="alert-circle" size={18} color="#FF5252" />
          <Text style={[styles.text, { flex: 1 }]} numberOfLines={1}>
            {error || "Upload failed"}
          </Text>
          <Pressable onPress={retryUpload} style={styles.actionBtn}>
            <Text style={styles.actionText}>Retry</Text>
          </Pressable>
          <Pressable onPress={dismissUploadBanner} style={styles.actionBtn}>
            <Ionicons name="close" size={16} color="#aaa" />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontFamily: theme.fonts.medium,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    color: "#306E6F",
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    fontWeight: "600",
  },
});
