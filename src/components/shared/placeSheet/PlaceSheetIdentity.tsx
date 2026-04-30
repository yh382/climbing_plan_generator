import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../../../lib/useThemeColors';

type Props = {
  title: string;
  subtitle?: string | null;
};

export function PlaceSheetIdentity({ title, subtitle }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 22,
      paddingTop: 16,
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 26,
      letterSpacing: -0.3,
      color: c.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textSecondary,
      marginTop: 4,
    },
  });
