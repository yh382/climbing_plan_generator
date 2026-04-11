import React, { useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';

interface GymDropdownPillProps {
  gymName: string;
  onPress?: () => void;
  weeklyActive?: number;
  totalSends?: number;
  gradeFeel?: string;
  /** When true, renders as a static card with no chevron or press handler. */
  readonly?: boolean;
}

export default function GymDropdownPill({
  gymName,
  onPress,
  weeklyActive,
  totalSends,
  gradeFeel,
  readonly = false,
}: GymDropdownPillProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const Wrapper: any = readonly ? View : TouchableOpacity;
  const wrapperProps = readonly ? {} : { onPress, activeOpacity: 0.7 };

  return (
    <Wrapper style={styles.card} {...wrapperProps}>
      <View style={styles.topRow}>
        <Text style={styles.name} numberOfLines={1}>{gymName}</Text>
        {!readonly && <Ionicons name="chevron-down" size={14} color="#FFF" />}
      </View>
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {totalSends != null ? totalSends.toLocaleString() : '—'}
          </Text>
          <Text style={styles.kpiLabel}>Sends</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>
            {weeklyActive != null ? String(weeklyActive) : '—'}
          </Text>
          <Text style={styles.kpiLabel}>Active</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{gradeFeel ?? '—'}</Text>
          <Text style={styles.kpiLabel}>Feel</Text>
        </View>
      </View>
    </Wrapper>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: '#FFF',
    marginRight: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#FFF',
  },
  kpiLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
});
