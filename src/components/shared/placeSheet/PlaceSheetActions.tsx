import { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';

export type PlaceSheetAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** `solid` renders the pill as an accent-filled primary CTA with
   *  white content (use for the most important next step — Enter /
   *  Community). `tint` is the default accent-tinted secondary pill. */
  variant?: 'solid' | 'tint';
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
};

type Props = {
  actions: PlaceSheetAction[];
};

export function PlaceSheetActions({ actions }: Props) {
  const colors = useThemeColors();
  const scheme = useColorScheme();
  const tint =
    scheme === 'dark' ? 'rgba(48,110,111,0.22)' : 'rgba(48,110,111,0.15)';
  const styles = useMemo(() => createStyles(colors, tint), [colors, tint]);

  return (
    <View style={styles.row}>
      {actions.map((a, i) => {
        const inert = a.disabled || a.loading;
        const solid = a.variant === 'solid';
        const contentColor = solid ? '#FFFFFF' : colors.accent;
        return (
          <TouchableOpacity
            key={`${a.label}-${i}`}
            onPress={a.onPress}
            disabled={inert}
            activeOpacity={0.75}
            style={[
              styles.pill,
              solid ? styles.pillSolid : styles.pillTint,
              inert && styles.pillInert,
            ]}
          >
            {a.loading ? (
              <ActivityIndicator size="small" color={contentColor} />
            ) : (
              <>
                <Ionicons name={a.icon} size={20} color={contentColor} />
                <Text
                  style={[styles.label, { color: contentColor }]}
                  numberOfLines={1}
                >
                  {a.label}
                </Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>, tint: string) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      paddingHorizontal: 22,
      gap: 10,
      marginBottom: 16,
    },
    pill: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    pillSolid: {
      backgroundColor: c.accent,
    },
    pillTint: {
      backgroundColor: tint,
    },
    pillInert: {
      opacity: 0.5,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
