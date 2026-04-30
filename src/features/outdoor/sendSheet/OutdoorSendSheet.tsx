// src/features/outdoor/sendSheet/OutdoorSendSheet.tsx
// Send sheet for outdoor routes — style + attempts + stars + suggest-a-grade + comment.
// Feel is derived from suggested_grade vs original grade (soft / solid / hard).
// Kept separate from journal's LogSendModal to avoid coupling.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Image } from 'expo-image';
import { NativeSegmentedControl } from '@/components/ui/NativeSegmentedControl';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import type { PickedMediaItem } from '@/features/community/types';

export type SendStyle = 'redpoint' | 'onsight' | 'flash';
export type Feel = 'soft' | 'solid' | 'hard';

export type OutdoorSendDraft = {
  style: SendStyle;
  attempts: number;
  stars: number;
  suggested_grade: string;
  feel: Feel;
  comment: string;
};

interface Props {
  visible: boolean;
  routeName: string;
  /** Original grade string (e.g. "5.11b" or "V5") used as default + baseline for feel. */
  originalGrade: string;
  /** Grade options to choose from (e.g. ["5.10a", "5.10b", ...]). */
  gradeOptions: string[];
  /** Index of originalGrade in gradeOptions — feel derived from selected index vs this. */
  originalGradeIndex: number;
  onClose: () => void;
  onDone: (draft: OutdoorSendDraft) => void | Promise<void>;
  /** Optional — parent dismisses the sheet and pushes to the media picker.
   *  When omitted, the Share Beta row is hidden (e.g. routes without context). */
  onShareBeta?: () => void;
  /** When set, the sheet shows an "attached" row with a thumbnail + remove
   *  action. Populated by the parent after the picker returns. On Done,
   *  the parent uses this video to upload alongside the log submission. */
  betaVideo?: PickedMediaItem | null;
  /** Clears `betaVideo` in the parent (Remove button). */
  onRemoveBeta?: () => void;
  tr?: (zh: string, en: string) => string;
}

const STYLE_LABELS = ['Redpoint', 'Onsight', 'Flash'];
const STYLE_KEYS: SendStyle[] = ['redpoint', 'onsight', 'flash'];

export default function OutdoorSendSheet({
  visible, routeName, originalGrade, gradeOptions, originalGradeIndex,
  onClose, onDone, onShareBeta, betaVideo, onRemoveBeta, tr,
}: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useMemo(() => tr ?? ((_zh: string, en: string) => en), [tr]);
  const sheetRef = useRef<TrueSheet>(null);
  const commentSheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  const [style, setStyle] = useState<SendStyle>('redpoint');
  const [attempts, setAttempts] = useState(1);
  // Default to unrated (0) so the user explicitly picks. A pre-set 4-star
  // rating was biasing data — climbers who didn't care tapped Done and
  // every route was "4 stars".
  const [stars, setStars] = useState(0);
  const [gradeIdx, setGradeIdx] = useState(originalGradeIndex);
  const [comment, setComment] = useState('');
  // Draft buffer so editing in the nested CommentSheet doesn't mutate the
  // main sheet's `comment` until the user taps Done. Cancel drops the draft.
  const [commentDraft, setCommentDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && !isPresented.current) {
      setTimeout(() => {
        sheetRef.current?.present();
        isPresented.current = true;
      }, 50);
      setStyle('redpoint');
      setAttempts(1);
      setStars(0);
      setGradeIdx(originalGradeIndex);
      setComment('');
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible, originalGradeIndex]);

  /** Feel derived from suggested grade relative to original. */
  const feel: Feel = useMemo(() => {
    if (gradeIdx < originalGradeIndex) return 'soft';
    if (gradeIdx > originalGradeIndex) return 'hard';
    return 'solid';
  }, [gradeIdx, originalGradeIndex]);

  const feelColor = feel === 'soft' ? '#34C759' : feel === 'hard' ? '#FF3B30' : colors.accent;
  const suggestedGrade = gradeOptions[gradeIdx] ?? originalGrade;

  const openCommentSheet = useCallback(() => {
    setCommentDraft(comment);
    commentSheetRef.current?.present().catch(() => {});
  }, [comment]);

  const commitComment = useCallback(() => {
    setComment(commentDraft);
    commentSheetRef.current?.dismiss().catch(() => {});
  }, [commentDraft]);

  const cancelComment = useCallback(() => {
    commentSheetRef.current?.dismiss().catch(() => {});
  }, []);

  const handleDone = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.resolve(
        onDone({
          style,
          attempts: style === 'redpoint' ? attempts : 1,
          stars,
          suggested_grade: suggestedGrade,
          feel,
          comment,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  }, [submitting, onDone, style, attempts, stars, suggestedGrade, feel, comment]);

  return (
    <>
    <TrueSheet
      ref={sheetRef}
      detents={['auto']}
      dimmed
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={colors.background}
      onDidDismiss={() => onClose()}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 14 }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('记录完成', 'Log Send')}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{routeName}</Text>
            </View>
            <TouchableOpacity
              onPress={() => sheetRef.current?.dismiss()}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Share Beta — two visual states:
              1. No video yet: invite row. Tap dismisses this sheet and
                 pushes the media picker. After the picker flow completes,
                 the parent re-presents this sheet with `betaVideo` set.
              2. Video attached: preview row with thumbnail + duration.
                 Change re-opens the picker; Remove clears the pending
                 video (send is logged without a beta). */}
          {betaVideo ? (
            <View style={styles.betaAttachedRow}>
              {betaVideo.coverUri ? (
                <Image
                  source={{ uri: betaVideo.coverUri }}
                  style={styles.betaThumbnail}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.betaThumbnail, styles.betaThumbnailFallback]}>
                  <Ionicons name="videocam" size={20} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.betaAttachedTitle}>
                  {t('Beta 视频已附上', 'Beta video attached')}
                </Text>
                <Text style={styles.betaAttachedMeta}>
                  {betaVideo.duration ? `${Math.round(betaVideo.duration)}s · ` : ''}
                  {t('完成时一起上传', 'Uploaded on Done')}
                </Text>
              </View>
              {onShareBeta ? (
                <TouchableOpacity onPress={onShareBeta} hitSlop={8} disabled={submitting}>
                  <Text style={styles.betaActionText}>{t('换一个', 'Change')}</Text>
                </TouchableOpacity>
              ) : null}
              {onRemoveBeta ? (
                <TouchableOpacity onPress={onRemoveBeta} hitSlop={8} disabled={submitting}>
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : onShareBeta ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onShareBeta}
              style={styles.shareBetaRow}
            >
              <View style={styles.shareBetaIconWrap}>
                <Ionicons name="videocam" size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareBetaTitle}>
                  {t('分享 Beta 视频', 'Share Beta Video')}
                </Text>
                <Text style={styles.shareBetaSubtitle}>
                  {t('帮助其他攀岩者了解这条线', 'Help other climbers see how it goes')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}

          {/* Style */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{t('方式', 'Style')}</Text>
            <NativeSegmentedControl
              options={STYLE_LABELS}
              selectedIndex={STYLE_KEYS.indexOf(style)}
              onSelect={(idx) => setStyle(STYLE_KEYS[idx])}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Attempts (redpoint only) */}
          {style === 'redpoint' && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{t('尝试次数', 'Attempts')}</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setAttempts((a) => Math.max(1, a - 1))}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="remove" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepValue}>{attempts}</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setAttempts((a) => a + 1)}
                    style={styles.stepBtn}
                  >
                    <Ionicons name="add" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Stars */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{t('评分', 'Rate')}</Text>
              <View style={styles.starsRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setStars(i + 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={i < stars ? 'star' : 'star-outline'}
                      size={24}
                      color="#FFD60A"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Suggest a grade */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>{t('建议等级', 'Suggest Grade')}</Text>
              <View style={[styles.feelPill, { backgroundColor: feelColor }]}>
                <Text style={styles.feelText}>{feel.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.gradeStepperRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setGradeIdx((i) => Math.max(0, i - 1))}
                style={styles.stepBtn}
              >
                <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.gradeValue}>{suggestedGrade}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setGradeIdx((i) => Math.min(gradeOptions.length - 1, i + 1))}
                style={styles.stepBtn}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              {t(`原始等级: ${originalGrade}`, `Original grade: ${originalGrade}`)}
            </Text>
          </View>

          {/* Comment — compact row. Tap to open CommentSheet (nested
              TrueSheet) where the user types + taps Done. Keeps the main
              sheet short so it fits on smaller screens without scroll. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openCommentSheet}
            style={styles.commentRow}
          >
            <Text style={styles.commentRowLabel}>{t('评价', 'Comment')}</Text>
            <Text
              style={[
                styles.commentRowValue,
                !comment ? { color: colors.textTertiary } : undefined,
              ]}
              numberOfLines={1}
            >
              {comment || t('添加评价…', 'Add a comment…')}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Done */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleDone}
            style={[styles.doneBtn, submitting && { opacity: 0.6 }]}
            disabled={submitting}
          >
            <Text style={styles.doneText}>{submitting ? t('提交中…', 'Submitting…') : t('完成', 'Done')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TrueSheet>

    {/* Comment editor — nested TrueSheet stacked on top of the main
        send sheet. Cancel drops the draft; Done commits back into the
        main sheet's comment state. */}
    <TrueSheet
      ref={commentSheetRef}
      detents={['auto']}
      dimmed
      dismissible
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={colors.background}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.commentSheetContent, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.commentSheetHeader}>
            <TouchableOpacity onPress={cancelComment} hitSlop={8}>
              <Text style={styles.commentSheetCancel}>{t('取消', 'Cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.commentSheetTitle}>{t('评价', 'Comment')}</Text>
            <TouchableOpacity onPress={commitComment} hitSlop={8}>
              <Text style={styles.commentSheetDone}>{t('完成', 'Done')}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={commentDraft}
            onChangeText={setCommentDraft}
            placeholder={t('分享你的想法…', 'Share your thoughts…')}
            placeholderTextColor={colors.textTertiary}
            style={styles.commentSheetInput}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </View>
      </KeyboardAvoidingView>
    </TrueSheet>
    </>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    content: { paddingHorizontal: theme.spacing.screenPadding, paddingTop: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontFamily: theme.fonts.black, color: c.textPrimary },
    subtitle: { fontSize: 13, fontFamily: theme.fonts.regular, color: c.textSecondary, marginTop: 2 },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center', justifyContent: 'center',
    },
    section: { marginBottom: 12 },
    fieldLabel: {
      fontSize: 13, fontFamily: theme.fonts.bold,
      color: c.textSecondary, marginBottom: 8,
    },
    card: {
      backgroundColor: c.cardBackground,
      borderRadius: theme.borderRadius.card,
      padding: 16, marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    cardTitle: { fontSize: 14, fontFamily: theme.fonts.bold, color: c.textPrimary },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: {
      width: 32, height: 32, borderRadius: 16,
      borderWidth: 1, borderColor: c.cardBorder,
      alignItems: 'center', justifyContent: 'center',
    },
    stepValue: {
      fontSize: 17, fontFamily: theme.fonts.black,
      color: c.textPrimary, minWidth: 24, textAlign: 'center',
    },
    starsRow: { flexDirection: 'row', gap: 6 },
    gradeStepperRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 20, marginTop: 12,
    },
    gradeValue: {
      fontSize: 20, fontFamily: theme.fonts.bold,
      color: c.textPrimary, minWidth: 80, textAlign: 'center',
    },
    feelPill: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: theme.borderRadius.pill,
    },
    feelText: { color: '#FFFFFF', fontFamily: theme.fonts.black, fontSize: 10, letterSpacing: 0.6 },
    hintText: {
      fontSize: 11, fontFamily: theme.fonts.regular,
      color: c.textTertiary, textAlign: 'center', marginTop: 8,
    },
    input: {
      backgroundColor: c.inputBackground,
      borderRadius: theme.borderRadius.card,
      paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 14, fontFamily: theme.fonts.regular,
      color: c.textPrimary,
    },
    doneBtn: {
      // Sit well clear of the compact comment row above — the prior 4pt
      // gap made the two look welded together. Pill corners match the
      // primary action pattern elsewhere in the app.
      marginTop: 24,
      height: 52,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: c.pillBackground,
      alignItems: 'center', justifyContent: 'center',
    },
    doneText: { color: c.pillText, fontSize: 16, fontFamily: theme.fonts.black },

    // Share Beta row — accent-tinted background to flag it as optional
    // action (visually distinct from the neutral form fields below).
    shareBetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 16,
      borderRadius: theme.borderRadius.card,
      backgroundColor: c.inputBackground,
    },
    shareBetaIconWrap: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    shareBetaTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.textPrimary,
    },
    shareBetaSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    // Attached-beta row — different from invite: neutral background + real
    // thumbnail swapped in for the accent icon. Matches an iOS "attached
    // media chip" feel so it reads as confirmed state, not an action.
    betaAttachedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 16,
      borderRadius: theme.borderRadius.card,
      backgroundColor: c.inputBackground,
    },
    betaThumbnail: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: c.cardDark,
    },
    betaThumbnailFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    betaAttachedTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textPrimary,
    },
    betaAttachedMeta: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    betaActionText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.accent,
      paddingHorizontal: 6,
    },

    // Comment compact row — mirrors iOS list-row pattern: label left,
    // value (truncated) middle-right, chevron far right.
    commentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 14,
      marginTop: 8,
      borderRadius: theme.borderRadius.card,
      backgroundColor: c.inputBackground,
    },
    commentRowLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: c.textPrimary,
    },
    commentRowValue: {
      flex: 1,
      textAlign: 'right',
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textPrimary,
    },

    // Nested comment sheet.
    commentSheetContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 16,
    },
    commentSheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    commentSheetTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
    },
    commentSheetCancel: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textSecondary,
    },
    commentSheetDone: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.accent,
    },
    commentSheetInput: {
      backgroundColor: c.inputBackground,
      borderRadius: theme.borderRadius.card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: theme.fonts.regular,
      color: c.textPrimary,
      minHeight: 140,
    },
  });
