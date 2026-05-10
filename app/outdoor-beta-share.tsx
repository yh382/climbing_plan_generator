// app/outdoor-beta-share.tsx
// Native iOS formSheet route for the standalone "share beta" flow.
// Migrated from src/features/outdoor/components/BetaShareSheet.tsx
// (sheet-container-audit A1). Caller stages the picked video via
// useBetaShareHandoffStore, then router.push('/outdoor-beta-share?routeId=...&routeKind=outdoor').
// Route reads the staged video, runs the compress / thumbnail / R2 / POST
// pipeline, and uses the upload activity bridge to surface progress.

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { compressVideo } from "@/lib/videoCompression";
import { compressImage } from "@/lib/imageCompression";
import {
  startUpload,
  updateUpload,
  finishUpload,
} from "@/lib/uploadActivityBridge";
import {
  uploadSingleFileToR2,
  toFileUri,
} from "@/features/community/api";
import { gymsCatalogApi } from "@/features/gymsCatalog/api";
import { betaApi } from "@/features/outdoor/betaApi";
import useBetaShareHandoffStore from "@/store/useBetaShareHandoffStore";

const BETA_CATEGORY = "route-beta";

export default function OutdoorBetaShareRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{ routeId?: string; routeKind?: "outdoor" | "gym" }>();
  const routeId = params.routeId ?? "";
  const routeKind: "outdoor" | "gym" = params.routeKind === "gym" ? "gym" : "outdoor";

  const video = useBetaShareHandoffStore((s) => s.pendingVideo);
  const setPendingVideo = useBetaShareHandoffStore((s) => s.setPendingVideo);

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // setOptions merges with parent _layout options (unlike in-screen
  // <Stack.Screen options> which REPLACES them in this Expo Router version).
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      title: tr("分享 Beta", "Share Beta"),
      // Block formSheet drag-to-dismiss while upload is running.
      gestureEnabled: !submitting,
    });
  }, [navigation, submitting, tr]);

  // Defensive: if no staged video (shouldn't happen via normal flow), bounce out.
  useEffect(() => {
    if (!video) {
      const t = setTimeout(() => router.back(), 0);
      return () => clearTimeout(t);
    }
    return;
  }, [video, router]);

  // Clear the staged video when the route unmounts so a stale video doesn't
  // leak into the next push.
  useEffect(() => {
    return () => {
      setPendingVideo(null);
    };
  }, [setPendingVideo]);

  const handleSubmit = async () => {
    if (!video || submitting || !routeId) return;
    setSubmitting(true);
    const uploadId = startUpload(tr("上传 Beta…", "Uploading beta…"), "la");
    try {
      updateUpload(uploadId, 0, "compressing");
      const compressedUri = await compressVideo(video.uri, (p) =>
        updateUpload(uploadId, p * 0.6, "compressing"),
      );
      updateUpload(uploadId, 0.6, "uploading");

      // Prefer caller-supplied cover frame; fall back to auto-generated.
      let thumbnailUrl: string | undefined;
      const localThumbUri =
        video.coverUri ??
        (await (async () => {
          try {
            const VT = await import("expo-video-thumbnails");
            const { uri } = await VT.getThumbnailAsync(compressedUri, {
              time: 1000,
              quality: 0.7,
            });
            return uri;
          } catch {
            return undefined;
          }
        })());

      if (localThumbUri) {
        try {
          const compressedThumb = await compressImage(localThumbUri, "thumbnail");
          const thumbFileUri = await toFileUri(compressedThumb);
          thumbnailUrl = await uploadSingleFileToR2(
            thumbFileUri,
            "image/jpeg",
            BETA_CATEGORY,
          );
        } catch {
          // Non-fatal — backend accepts null thumbnail_url.
        }
      }

      updateUpload(uploadId, 0.85, "uploading");
      const mediaUrl = await uploadSingleFileToR2(
        compressedUri,
        "video/mp4",
        BETA_CATEGORY,
      );
      updateUpload(uploadId, 0.95);

      const body = {
        media_url: mediaUrl,
        thumbnail_url: thumbnailUrl,
        description: comment.trim() || null,
      };
      if (routeKind === "gym") {
        await gymsCatalogApi.createBeta(routeId, body);
      } else {
        await betaApi.createForRoute(routeId, body);
      }

      finishUpload(uploadId, "success");
      router.back();
    } catch (err: any) {
      const msg =
        err?.detail || err?.message || tr("上传失败，请重试", "Upload failed");
      finishUpload(uploadId, "error", msg);
      Alert.alert(tr("上传失败", "Upload failed"), msg);
      setSubmitting(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.screenPadding,
            paddingBottom: insets.bottom + 20,
            paddingTop: 8,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {video ? (
            <View style={styles.videoRow}>
              {video.coverUri ? (
                <Image
                  source={{ uri: video.coverUri }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailFallback]}>
                  <Ionicons name="videocam" size={24} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.videoTitle} numberOfLines={1}>
                  {tr("已选视频", "Video selected")}
                </Text>
                {video.duration ? (
                  <Text style={styles.videoMeta}>{Math.round(video.duration)}s</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>
            {tr("评价 (可选)", "Comment (optional)")}
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={tr(
              "写点说明，比如 beta、条件、装备…",
              "Share your beta, conditions, gear…",
            )}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            multiline
            maxLength={500}
            textAlignVertical="top"
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.submitBtn, (!video || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!video || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.pillText} />
            ) : (
              <Text style={styles.submitBtnText}>{tr("提交", "Submit")}</Text>
            )}
          </TouchableOpacity>

          {submitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.submittingText}>
                {tr("正在压缩视频并上传…", "Compressing video and uploading…")}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    videoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.backgroundSecondary,
      marginBottom: 14,
    },
    thumbnail: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: c.cardDark,
    },
    thumbnailFallback: {
      alignItems: "center",
      justifyContent: "center",
    },
    videoTitle: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: c.textPrimary,
    },
    videoMeta: {
      marginTop: 2,
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
    },
    fieldLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    input: {
      minHeight: 100,
      padding: 12,
      backgroundColor: c.backgroundSecondary,
      borderRadius: 10,
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      color: c.textPrimary,
    },
    submitBtn: {
      marginTop: 20,
      height: 52,
      backgroundColor: c.pillBackground,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    submitBtnDisabled: { backgroundColor: c.sheetCardBackground },
    submitBtnText: {
      color: c.pillText,
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    submittingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 16,
      justifyContent: "center",
    },
    submittingText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
    },
  });
