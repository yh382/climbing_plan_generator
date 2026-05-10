// src/features/community/components/EditCaptionSheet.tsx
// KAYA γ1.1: minimal caption editor for auto-share posts. Users cannot
// recompose a post (media is derived from the climb log), but they can
// add/edit a caption after the fact via PATCH /posts/{id} (content_text only).
//
// Inline TrueSheet, single TextInput multiline, Save / Cancel. No media /
// visibility editing — those stay tied to the source ClimbLog by design.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { useSettings } from '@/contexts/SettingsContext';

const MAX_CAPTION_LENGTH = 500;

interface EditCaptionSheetProps {
  sheetRef: React.RefObject<TrueSheet | null>;
  postId: string | null;
  initialContent: string;
  onSave: (postId: string, content: string) => Promise<void>;
}

export default function EditCaptionSheet({
  sheetRef,
  postId,
  initialContent,
  onSave,
}: EditCaptionSheetProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draft, setDraft] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reset draft whenever the sheet is reopened for a different post.
  useEffect(() => {
    setDraft(initialContent);
  }, [postId, initialContent]);

  const handleCancel = () => {
    Keyboard.dismiss();
    sheetRef.current?.dismiss();
  };

  const handleSave = async () => {
    if (!postId || saving) return;
    setSaving(true);
    try {
      await onSave(postId, draft.trim());
      Keyboard.dismiss();
      sheetRef.current?.dismiss();
    } catch (e: any) {
      Alert.alert(
        tr('保存失败', 'Save failed'),
        e?.message ?? tr('请稍后再试', 'Please try again later'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.55, 0.9]}
      dimmed
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={colors.sheetBackground}
      onDidPresent={() => {
        // Auto-focus after the present transition lands.
        setTimeout(() => inputRef.current?.focus(), 80);
      }}
    >
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} disabled={saving} hitSlop={12}>
            <Text style={[styles.actionText, saving && styles.actionTextDisabled]}>
              {tr('取消', 'Cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tr('编辑说明', 'Edit Caption')}</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !postId}
            hitSlop={12}
          >
            {saving ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={[styles.actionText, styles.actionTextStrong]}>
                {tr('保存', 'Save')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder={tr('写点说明…（选填）', 'Add a caption… (optional)')}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          multiline
          maxLength={MAX_CAPTION_LENGTH}
          textAlignVertical="top"
          editable={!saving}
          autoFocus={false}
        />

        <Text style={styles.counter}>
          {draft.length} / {MAX_CAPTION_LENGTH}
        </Text>
      </SafeAreaView>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    title: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    actionText: {
      fontSize: 16,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    actionTextStrong: {
      fontFamily: theme.fonts.medium,
      color: colors.accent,
    },
    actionTextDisabled: {
      opacity: 0.4,
    },
    input: {
      minHeight: 160,
      maxHeight: 320,
      marginTop: 12,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: theme.fonts.regular,
      color: colors.textPrimary,
    },
    counter: {
      marginTop: 8,
      textAlign: 'right',
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
  });
