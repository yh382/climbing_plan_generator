// src/features/outdoor/components/BetaCard.tsx
// Beta list card — single-column layout: square-ish video thumbnail on top,
// route name + grade + author + like count below. Thumbnail falls back to a
// color block on load failure (mirrors AH's AreaCoverImage pattern so the
// offline story stays consistent).
//
// Like state is driven from the parent so optimistic updates survive list
// re-renders. The card does NOT fire the API — the parent's `onToggleLike`
// hook decides whether to POST or DELETE.

import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { BetaOut } from '../betaApi';

interface BetaCardProps {
  beta: BetaOut;
  onPress: () => void;
  onToggleLike: () => void;
}

export function BetaCard({ beta, onPress, onToggleLike }: BetaCardProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [thumbFailed, setThumbFailed] = useState(false);

  const authorLabel =
    beta.author.display_name ?? beta.author.username ?? tr('用户', 'Climber');
  const showThumb = beta.thumbnail_url && !thumbFailed;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {showThumb ? (
        <Image
          source={{ uri: beta.thumbnail_url! }}
          style={styles.thumb}
          onError={() => setThumbFailed(true)}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="videocam" size={32} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.playOverlay} pointerEvents="none">
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.92)" />
      </View>

      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text style={styles.routeName} numberOfLines={1}>
            {beta.route.name}
          </Text>
          <Text style={styles.grade}>{beta.route.grade_text}</Text>
        </View>
        {beta.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {beta.description}
          </Text>
        ) : null}
        <View style={styles.footerRow}>
          <Text style={styles.author} numberOfLines={1}>
            @{beta.author.username ?? authorLabel}
          </Text>
          <Pressable
            style={styles.likeBtn}
            onPress={onToggleLike}
            hitSlop={10}
          >
            <Ionicons
              name={beta.liked_by_me ? 'heart' : 'heart-outline'}
              size={18}
              color={beta.liked_by_me ? '#FF3B30' : colors.textSecondary}
            />
            <Text
              style={[
                styles.likeCount,
                beta.liked_by_me ? { color: '#FF3B30' } : undefined,
              ]}
            >
              {beta.likes_count}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.background,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: 14,
    },
    thumb: {
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: c.backgroundSecondary,
    },
    thumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    playOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      // 9:16 slice matches aspectRatio so the play icon sits over the thumb.
      aspectRatio: 16 / 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meta: {
      paddingTop: 10,
      paddingHorizontal: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    routeName: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
    },
    grade: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.accent,
    },
    description: {
      marginTop: 4,
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
    },
    footerRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    author: {
      flex: 1,
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
    },
    likeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 4,
    },
    likeCount: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      minWidth: 14,
      textAlign: 'left',
    },
  });
