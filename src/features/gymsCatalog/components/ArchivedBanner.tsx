// Banner shown atop archived gym route detail pages. KAYA pattern: the
// route is hidden from the live floor plan but historical data stays
// accessible — banner makes that state explicit so callers don't try
// to log new sends against a route the gym has retired.

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';

type Props = { archivedAt?: string | null };

export function ArchivedBanner({ archivedAt }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dateStr = archivedAt
    ? new Date(archivedAt).toLocaleDateString()
    : '';

  return (
    <View style={styles.banner}>
      <Ionicons name="archive-outline" size={16} color={colors.textSecondary} />
      <Text style={styles.text}>
        {dateStr
          ? tr(
              `这条路线已于 ${dateStr} 归档,仅显示历史记录`,
              `Archived ${dateStr}. Showing historical data only.`,
            )
          : tr('这条路线已归档,仅显示历史记录', 'Archived. Showing historical data only.')}
      </Text>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.backgroundSecondary,
    },
    text: {
      flex: 1,
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
    },
  });
