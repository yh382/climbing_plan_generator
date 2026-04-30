// src/features/outdoor/components/BetaShareSheet.tsx
// Lightweight sheet for the "pure share beta" flow (route detail camera
// button → picker → this sheet). Parallel to — but intentionally smaller
// than — the Send sheet's integrated beta path, which also records a send
// log. This path is for users who just want to share a video without
// committing to a Send log.
//
// Shape: video thumbnail preview + comment TextInput + Submit. Runs the
// compress/thumbnail/R2/POST pipeline on Submit.

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { compressVideo } from '../../../lib/videoCompression';
import {
  uploadSingleFileToR2,
  toFileUri,
} from '../../community/api';
import type { PickedMediaItem } from '../../community/types';
import { betaApi } from '../betaApi';

const BETA_CATEGORY = 'route-beta';
const MAX_VIDEO_DURATION_SECONDS = 90;

export interface BetaShareSheetHandle {
  present: (video: PickedMediaItem) => void;
  dismiss: () => void;
}

interface Props {
  routeId: string;
  onSuccess?: () => void;
}

const BetaShareSheet = forwardRef<BetaShareSheetHandle, Props>(
  ({ routeId, onSuccess }, ref) => {
    const colors = useThemeColors();
    const { tr } = useSettings();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef<TrueSheet>(null);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [video, setVideo] = useState<PickedMediaItem | null>(null);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useImperativeHandle(ref, () => ({
      present: (v) => {
        if (v.duration && v.duration > MAX_VIDEO_DURATION_SECONDS) {
          Alert.alert(
            tr('视频过长', 'Video too long'),
            tr(
              `Beta 视频请保持在 ${MAX_VIDEO_DURATION_SECONDS} 秒以内`,
              `Keep beta videos under ${MAX_VIDEO_DURATION_SECONDS} seconds.`,
            ),
          );
          return;
        }
        setVideo(v);
        setComment('');
        sheetRef.current?.present().catch(() => {});
      },
      dismiss: () => {
        sheetRef.current?.dismiss().catch(() => {});
      },
    }));

    const handleCancel = useCallback(() => {
      if (submitting) return;
      sheetRef.current?.dismiss().catch(() => {});
    }, [submitting]);

    const handleSubmit = useCallback(async () => {
      if (!video || submitting) return;
      setSubmitting(true);
      try {
        const compressedUri = await compressVideo(video.uri);

        // Prefer cover-picker's chosen frame; fall back to auto-generated.
        let thumbnailUrl: string | undefined;
        const localThumbUri =
          video.coverUri ??
          (await (async () => {
            try {
              const VT = await import('expo-video-thumbnails');
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
            const thumbFileUri = await toFileUri(localThumbUri);
            thumbnailUrl = await uploadSingleFileToR2(
              thumbFileUri,
              'image/jpeg',
              BETA_CATEGORY,
            );
          } catch {
            // Non-fatal — backend accepts null thumbnail_url.
          }
        }

        const mediaUrl = await uploadSingleFileToR2(
          compressedUri,
          'video/mp4',
          BETA_CATEGORY,
        );

        await betaApi.createForRoute(routeId, {
          media_url: mediaUrl,
          thumbnail_url: thumbnailUrl,
          description: comment.trim() || null,
        });

        sheetRef.current?.dismiss().catch(() => {});
        onSuccess?.();
      } catch (err: any) {
        const msg =
          err?.detail || err?.message || tr('上传失败，请重试', 'Upload failed');
        Alert.alert(tr('上传失败', 'Upload failed'), msg);
      } finally {
        setSubmitting(false);
      }
    }, [comment, onSuccess, routeId, submitting, tr, video]);

    return (
      <TrueSheet
        ref={sheetRef}
        name="beta-share-sheet"
        detents={['auto']}
        dimmed
        dismissible={!submitting}
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        backgroundColor={colors.background}
        onDidDismiss={() => {
          setVideo(null);
          setComment('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.content, { paddingBottom: insets.bottom + 14 }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={handleCancel} hitSlop={8} disabled={submitting}>
                <Text
                  style={[
                    styles.cancel,
                    submitting ? { color: colors.textTertiary } : undefined,
                  ]}
                >
                  {tr('取消', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.title}>
                {tr('分享 Beta', 'Share Beta')}
              </Text>
              <TouchableOpacity
                onPress={handleSubmit}
                hitSlop={8}
                disabled={!video || submitting}
              >
                <Text
                  style={[
                    styles.submit,
                    !video || submitting
                      ? { color: colors.textTertiary }
                      : undefined,
                  ]}
                >
                  {submitting ? tr('上传中…', 'Uploading…') : tr('提交', 'Submit')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Video preview row — thumbnail from cover-picker's pick */}
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
                    {tr('已选视频', 'Video selected')}
                  </Text>
                  {video.duration ? (
                    <Text style={styles.videoMeta}>
                      {Math.round(video.duration)}s
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Comment / description */}
            <Text style={styles.fieldLabel}>
              {tr('评价 (可选)', 'Comment (optional)')}
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={tr(
                '写点说明，比如 beta、条件、装备…',
                'Share your beta, conditions, gear…',
              )}
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              multiline
              maxLength={500}
              textAlignVertical="top"
              editable={!submitting}
            />

            {submitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.submittingText}>
                  {tr(
                    '正在压缩视频并上传…',
                    'Compressing video and uploading…',
                  )}
                </Text>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </TrueSheet>
    );
  },
);

BetaShareSheet.displayName = 'BetaShareSheet';
export default BetaShareSheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
    },
    cancel: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textSecondary,
    },
    submit: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.accent,
    },
    videoRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
      alignItems: 'center',
      justifyContent: 'center',
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
      textTransform: 'uppercase',
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
    submittingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
    },
    submittingText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
    },
  });
