// Route expiry / staleness badge (Window INDOOR_SET / SET-P3). The setter
// sets an expiry_date (planned strip/reset). For the climber this is the
// "climb it before it's gone" signal:
//   • past due      → "Expired"
//   • within 14 days → "Expires in Nd"
//   • further out / no date → nothing (we don't nag about fresh routes)
// Uses the theme warning token (colors.attempt) so it stays correct in
// dark mode — no hardcoded hex.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';

type Props = { expiryDate?: string | null };

const EXPIRY_SOON_DAYS = 14;

/** Parse a YYYY-MM-DD string to a *local* midnight Date so the day-diff
 *  isn't thrown off by `new Date('YYYY-MM-DD')`'s UTC parsing. */
function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function RouteExpiryBadge({ expiryDate }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const info = useMemo(() => {
    if (!expiryDate) return null;
    const expiry = parseLocalDate(expiryDate);
    if (!expiry) return null;
    const now = new Date();
    const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysLeft = Math.round(
      (expiry.getTime() - todayMid.getTime()) / 86_400_000,
    );
    if (daysLeft < 0) {
      return { icon: 'alert-circle-outline' as const, label: tr('已过期', 'Expired') };
    }
    if (daysLeft > EXPIRY_SOON_DAYS) return null;
    const label =
      daysLeft === 0
        ? tr('今天到期', 'Expires today')
        : daysLeft === 1
          ? tr('明天到期', 'Expires tomorrow')
          : tr(`${daysLeft} 天后到期`, `Expires in ${daysLeft}d`);
    return { icon: 'time-outline' as const, label };
  }, [expiryDate, tr]);

  if (!info) return null;

  return (
    <View style={styles.badge}>
      <Ionicons name={info.icon} size={13} color={colors.attempt} />
      <Text style={styles.text}>{info.label}</Text>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: c.backgroundSecondary,
    },
    text: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.attempt,
    },
  });
