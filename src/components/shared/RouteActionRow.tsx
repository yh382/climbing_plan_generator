// Route detail action row: Send (primary) + Attempt (secondary, with a
// running +N counter) + Camera (share-beta). Shared by the outdoor +
// indoor-gym route detail pages (both previously inlined an identical row).
//
// States:
//  • disabled (gym archived routes) → all three inert, primary greys out
//  • userHasSent → primary shows the "Sent" confirmation (no re-send)
//  • default → accent Send button
// Outdoor has no archived concept, so it simply omits `disabled`.

import { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../lib/theme';
import { useThemeColors } from '../../lib/useThemeColors';

// "Already sent" button palette — theme-agnostic by design (a disabled
// confirmation state, not a brand surface). Mid-grey keeps white text +
// checkmark readable in both light & dark; the tick stays emerald to
// celebrate completion.
export const SENDED_BG = '#6B7280';
export const SENDED_TICK = '#34D399'; // emerald-400

type Props = {
  userHasSent: boolean;
  /** Running local attempt count — renders a "+N" badge when > 0. */
  attempts: number;
  onSend: () => void;
  onAttempt: () => void;
  onShareBeta: () => void;
  /** Archived routes (gym): disables all three + greys the primary. */
  disabled?: boolean;
  tr: (zh: string, en: string) => string;
  /** Optional override for the row container (e.g. extra marginTop). */
  style?: StyleProp<ViewStyle>;
};

export function RouteActionRow({
  userHasSent,
  attempts,
  onSend,
  onAttempt,
  onShareBeta,
  disabled = false,
  tr,
  style,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const primaryBg = disabled
    ? colors.backgroundSecondary
    : userHasSent
      ? SENDED_BG
      : colors.accent;
  const primaryIconColor = disabled
    ? colors.textTertiary
    : userHasSent
      ? SENDED_TICK
      : '#FFFFFF';

  return (
    <View style={[styles.actionRow, style]}>
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: primaryBg }]}
        onPress={disabled || userHasSent ? undefined : onSend}
        disabled={disabled || userHasSent}
        activeOpacity={0.85}
      >
        <Ionicons
          name={userHasSent ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={18}
          color={primaryIconColor}
        />
        <Text
          style={[
            styles.primaryBtnText,
            disabled && { color: colors.textTertiary },
          ]}
        >
          {userHasSent ? tr('已完成', 'Sent') : tr('完成', 'Send')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { backgroundColor: colors.pillBackground }]}
        onPress={onAttempt}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Ionicons name="refresh-outline" size={18} color={colors.pillText} />
        <Text style={styles.secondaryBtnText}>{tr('尝试', 'Attempt')}</Text>
        {attempts > 0 && (
          <View style={styles.attemptBadge}>
            <Text style={styles.attemptBadgeText}>+{attempts}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cameraBtn, { backgroundColor: colors.pillBackground }]}
        onPress={onShareBeta}
        disabled={disabled}
        activeOpacity={0.85}
        hitSlop={6}
      >
        <Ionicons name="videocam-outline" size={20} color={colors.pillText} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    primaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.card,
    },
    primaryBtnText: {
      fontFamily: theme.fonts.black,
      fontSize: 15,
      color: '#FFFFFF',
    },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.card,
      position: 'relative',
    },
    secondaryBtnText: {
      fontFamily: theme.fonts.black,
      fontSize: 15,
      color: c.pillText,
    },
    cameraBtn: {
      width: 48,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.card,
    },
    attemptBadge: {
      position: 'absolute',
      top: 6,
      right: 10,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 999,
      backgroundColor: c.accent,
    },
    attemptBadgeText: {
      fontFamily: theme.fonts.bold,
      fontSize: 10,
      color: '#FFFFFF',
    },
  });
