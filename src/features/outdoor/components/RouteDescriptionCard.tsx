import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';

type Props = {
  description: string | null | undefined;
};

export function RouteDescriptionCard({ description }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const text = description?.trim();

  return (
    <View style={styles.card}>
      {text ? (
        <Text style={styles.body}>{text}</Text>
      ) : (
        <Text style={styles.empty}>{tr('暂无描述', 'No description yet')}</Text>
      )}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.cardBackground,
      borderRadius: 16,
      padding: 16,
    },
    body: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: c.textPrimary,
    },
    empty: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: c.textTertiary,
    },
  });
